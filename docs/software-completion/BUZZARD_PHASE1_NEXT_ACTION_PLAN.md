# Buzzard — Phase 1 Next Action Plan (205 / 212 / 220 / 217)

Date: 2026-10-16  
HEAD: `b9d3ae835fdf0e31b1815dc577d6b98b07a1ce54`  
PR #430: OPEN draft, base **`cursor/security-session-closeout-c293`**, `headRefOid` = HEAD  
Mode: salt okunur + güvenli yerel koşu. Kod/config/git/PR/deploy/production **yok**.  
Satış / canlı ödeme / Product SoT **kapalı**. Yeni yüzde yok. **TAMAMLANDI yok.**

Kaynak: `BUZZARD_PHASE1_CI_DISK_MONITORING_READINESS.md` (tekrar etmez; **engeli kaldıran işlem** öne alınır).

Yerel `npm run build` `publish-taxonomy-artifacts.mjs` ile iki takip edilen `buzzard_production_preflight.json` dosyasını yazdı; **hemen `git checkout` ile geri alındı**. Takip edilen ağaç yine temiz.

---

## A) CI — job envanteri

`.github/workflows/ci.yml` tetik: yalnızca `pull_request` **ve** `push` **`branches: [main]`**. `workflow_dispatch` yok. Secret **okunmadı**.

| Job | Komutlar | Env (isim) | Yerel bu oturum |
| --- | --- | --- | --- |
| **quality** | `npm ci` → lint → typecheck → build → test:ai → test:software → test:unit → render:preflight → security:check | yok (script içi varsayılan) | `npm ci` **atlandı** (kilit/node_modules yazar). Geri kalanlar aşağıda. |
| **e2e-storefront** | `npm ci`, build, `npx playwright install --with-deps chromium`, `python3 -m http.server 3040 --directory out`, Playwright `homepage-viewports` | `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_SKIP_WEBSERVER` | `npm ci` ve `--with-deps` **atlandı**; mevcut Chromium + mevcut `out/` ile **18 passed**. |
| **e2e-admin** | build with `NEXT_PUBLIC_BUZZARD_API_URL=http://127.0.0.1:3001`; `node server/server.js`; Playwright admin/journey | `BUZZARD_SALES_ENABLED=0`, `NEXT_PUBLIC_SALES_ENABLED=0`, `BUZZARD_TEST_MODE=1`, `BUZZARD_API_URL`, `NEXT_PUBLIC_BUZZARD_API_URL`, Playwright vars | **Çalıştırılmadı** — API süreci varsayılan/mevcut SQLite’a yazar. |

Script env (değer yok):

- `render:preflight.mjs`: `BUZZARD_API_URL` (varsayılan **canlı** `https://buzzard-api.onrender.com`), `BUZZARD_SITE_URL`. Ayrıca `npm ci --prefix server` (dosya değiştirir) + **production GET**.
- `security:check.mjs`: `npm audit` (npm registry; Buzzard prod değil).
- E2E admin fixtures: `BUZZARD_ADMIN_EMAIL` / `BUZZARD_ADMIN_PASSWORD` **varsayılan test hesap adları** (secret okunmadı).

### Yerel sonuçlar (205 GitHub kanıtı **değil**)

| Adım | Sonuç |
| --- | --- |
| lint | exit 0 |
| typecheck | exit 0 |
| test:ai | 6 files, **62 passed** |
| test:software | 6 files, **143 passed** |
| test:unit | 113 files, **1084 passed** |
| build | exit 0 (Next export); taxonomy preflight **geri alındı** |
| security:check | exit 0, **1 WARN** (eslint-config-next/braces — script bunu uyarı sayar) |
| e2e-storefront (yerel eşdeğer) | **18 passed** |
| render:preflight | **atlanmadı gerekçe:** production fetch + `npm ci --prefix server` |
| e2e-admin | **atlanmadı gerekçe:** SQLite yan etkisi |
| `npm ci` | **atlanmadı gerekçe:** ağaç değişimi |

**Tam `ci.yml` yerelde birebir güvenli değil.** Engeli kaldırmaz.

### #430 tabanını/HEAD’ini değiştirmeden GitHub

| Madde | En düşük maliyet | Engeli kaldırır mı? |
| --- | --- | --- |
| **205** | İnsan, **aynı SHA** ile **yeni** PR açar, **base = `main`**. #430’a dokunulmaz. 0 € ürün; mevcut Actions dakikası. | **Evet** — `CI` `pull_request`→`main` tetiklenir. |
| **212** | Kabul: **bu PR’ın** (`#430`) `statusCheckRollup` dolması. Taban `main` olmadığı sürece `ci.yml` **hiç çalışmaz**. | **Hayır.** Tabanı değiştirmeden veya `ci.yml` tetikleyicisini genişletmeden (kod değişikliği, bu geçişte yasak) 212 **karşılanamaz**. |

İkinci PR 205’i kapatır, 212’yi **kapatmaz**. 212 için tek ücretsiz GitHub hareketi: **#430 base → `main`** (bu, kullanıcının “tabanı değiştirme” kısıtını **ihtiyaç olarak** kırar) — merge değil, yalnızca base.

### İnsan onayı (205/212)

1. Yeni PR `b9d3ae8…` → `main` (**205**).  
2. **212** isteniyorsa: #430 base’i `main` (HEAD aynı kalabilir).  
3. Merge / `main` push / deploy **hayır** (bu faz).  
4. `ci.yml`’e `workflow_dispatch` eklemek kod değişikliği — bu fazda yok.

---

## B) Disk 220 — engeli ne kaldırır?

Yerel `/var/data` yok → `getRenderDiskDiagnostics().exists=false`. Bu, **canlı Render disk yok** demek **değil**; yalnızca **bu VM’de mount yok**. Fail-closed testler (vitest 43 + bu oturumda unit içinde tekrar) şunu kanıtlar: production’da `BUZZARD_DB_PATH` yoksa veya `/tmp` ise **açılış reddi**. Kanıtlamaz: canlı `buzzard-data` bağlı.

**Engeli kaldıran işlem:** Render operatörü salt okunur:

1. Servis adı `buzzard-api`.  
2. Disk `buzzard-data`, mount `/var/data`.  
3. Env **yolu** `/var/data/buzzard.db` (değer sırrı yok).  
4. `GET /api/health/db` (public) → `persistence.mode=render_persistent_disk`, `persistent=true`.  
5. Yetkili restart sonrası dosya duruyor.

Bu ajan production’a bağlanmaz / disk oluşturmaz.

---

## C) Monitoring 217 — engeli ne kaldırır?

`GET /api/health` (`aiAutomationPlugin.js`): yalnızca `{ success, ok, status: "ok" }`. Disk, SQLite, satış **yok**.

`GET /api/health/db` (`controlCenterPlugin.js` → `toPublicDatabaseHealth`): `enabled/ok/persistent/ephemeralRisk` + `persistence.mode`. **Yok:** path, table counts, `backupDir`. Test: `fortressAuthz` public health şekli + 401 kilitli `/api/health/production|pusat|software|ai`.

Uptime: `uptime-monitor.yml` **`main` + schedule**; son yeşil `38848577315` 16.10 ~04:02 UTC. **`b9d3ae8` değil.** `verify-go-live.mjs` canlı `/api/health` + `/version` + site URL. Persistence **yok**.

**Engeli kaldıran işlem:** operatör tarihli public ` /api/health` **ve** `/api/health/db` persistence bayrakları (satış 0). Mevcut 6s uptime **ücretsiz** kalır; Datadog alma. Uptime yeşili 217’yi **kapatmaz**.

---

## D) Dört madde — sonraki adım

### 205 GitHub CI

- **Mevcut durum:** Bu SHA’da Actions `CI` yok (taban ≠ `main`). Yerel quality+storefront yeşil; GitHub değil.  
- **Kanıt:** `ci.yml` `on:`; `gh run list` bu branch boş; yerel exit kodları yukarıda.  
- **Eksik:** Actions `headSha=b9d3ae8` quality + 2 e2e.  
- **Güvenli yerel:** tekrar test koşusu engeli **kaldırmaz**.  
- **İnsan:** PR aynı HEAD → **`main`**.  
- **Maliyet:** 0 € ürün.  
- **Kabul:** o PR’da `CI` job’ları bitmiş.  
- **Sonraki adım:** insan `main` PR (430’a dokunmadan). **TAMAMLANDI değil.**

### 212 PR #430

- **Mevcut durum:** rollup `[]`; HEAD eşleşiyor.  
- **Kanıt:** `gh pr view 430` base ≠ `main`.  
- **Eksik:** #430 üzerindeki check’ler.  
- **Güvenli yerel:** yok (GitHub olayı).  
- **İnsan:** 212 için **#430 base = main** (kısıt kalkmadan imkânsız) **veya** 212’yi ertele.  
- **Maliyet:** 0 €.  
- **Kabul:** #430 `statusCheckRollup` dolu, aynı OID.  
- **Sonraki adım:** 205 için ikinci PR **212’yi çözmez**; 212 ayrı insan kararı. **TAMAMLANDI değil.**

### 220 Production disk

- **Mevcut durum:** blueprint var; canlı NOT_VERIFIED; yerelde `/var/data` yok.  
- **Kanıt:** `render.yaml`; `dbPaths.js` fail-closed; operator md.  
- **Eksik:** dashboard attach + prod `/api/health/db` persistent.  
- **Güvenli yerel:** fail-closed testler (zaten yeşil) — **engeli kaldırmaz**.  
- **İnsan:** Render salt okunur 5 madde.  
- **Maliyet:** disk zaten varsa 0; fatura **okunmadı**; satın alma yok.  
- **Kabul:** operator md satırları NOT_VERIFIED’den çıkar.  
- **Sonraki adım:** operatör checklist. **TAMAMLANDI değil.**

### 217 Monitoring

- **Mevcut durum:** kod hazır; canlı persistence yok; uptime `main` liveness.  
- **Kanıt:** handler kaynakları; fortress tests; uptime run `main`.  
- **Eksik:** prod `/api/health/db` kaydı.  
- **Güvenli yerel:** authz testleri — **engeli kaldırmaz**.  
- **İnsan:** public health+db JSON (sır yok).  
- **Maliyet:** 0 € yeni servis.  
- **Kabul:** tarihli persistence bayrakları.  
- **Sonraki adım:** 220 kanıtı ile birlikte okumak. **TAMAMLANDI değil.**

---

## Uygulama sırası (engel kaldırma)

1. İnsan: **yeni PR → `main`** (205).  
2. İnsan kararı: 212 için #430 retarget **veya** 212 açık kalsın.  
3. Operatör: disk 220.  
4. Operatör: `/api/health/db` 217.  

Yerel yeşil testler **hiçbir maddeyi kapatmaz**.

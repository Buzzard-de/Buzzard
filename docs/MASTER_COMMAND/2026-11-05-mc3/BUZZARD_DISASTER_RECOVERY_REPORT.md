# Felaket kurtarma — Command 3

**Durum:** PARTIAL. COMPLETE yok.

## Veri grupları (kanıt, varsayım yok)

| Grup | Yöntem | Hedef | Son test | Restore | Not |
| --- | --- | --- | --- | --- | --- |
| Database (SQLite) | `db-backup.mjs` + `copies32110` | yerel `server/data/backups` veya temp | 2026-11-05 lab | izole temp OK | Production `/var/data` yazılmadı |
| Product catalog | `snapshotLocalAreas` catalog | yerel kopya | birim | fixture | |
| Orders / customers / suppliers / finance | aynı SQLite alanları | yerel | kod var | lab probe | Canlı defter yok |
| Tax records | taxPools bellek | süreç içi | birim | kalıcı değil | |
| Config / IaC | git + render.yaml | git | — | git checkout | |
| Certificates / keys | kopyalanmaz (`isKeyMaterial`) | ayrı kasa gerekli | — | BLOCKED | Git’e yazılmadı |
| Pusat / AI memory | snapshot area | yerel | birim | canlı yok | |
| Audit / egress policy | repo + runtime audit ring | repo | — | git | |
| Source code | git | origin (push yok) | — | bu VM | uzak 2 commit geride |

## 3-2-1-1-0

| Katman | Durum |
| --- | --- |
| 3 kopya | CODE_READY (yerel) |
| 2 medya | PARTIAL (disk + gzip, aynı makine) |
| 1 offsite | BLOCKED (`BUZZARD_OFFSITE_BACKUP_DIR` yok) |
| Offline / bağımsız | BLOCKED |
| WORM | BLOCKED (`chmod 444` ≠ WORM) |
| 0 doğrulama hatası | lab fixture OK |

## Ölçüm (lab)

- `measuredRestoreMs`: **11** (temp probe DB)
- Production RPO: **ölçülmedi**
- Production RTO: **ölçülmedi**
- Hedef önerisi (SLA değil): DB RPO 15m / RTO 30m (`copies32110.RPO_RTO_PROPOSAL`)

## Runbook

Tespit → izolasyon → kimlik iptal → kanıt → temiz ortam → bütünlük → tarama → restore → uzlaştırma → güvenlik → kademeli açılış.  
Bu turda yalnızca adım 7–9 **temp DB** üzerinde çalıştı.

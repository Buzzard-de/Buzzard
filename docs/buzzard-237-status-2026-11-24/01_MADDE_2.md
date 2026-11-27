# Madde 2 — 24 Kasım 2026, 07:57 Europe/Berlin

Dal: `cursor/237-morning-status-c293`  
Başlangıç: `befa498037d6ca901e3fa904e62cd748b8bc1f62`  
Kurulu kapsam: tek Pusat, tek onay merkezi, tek ürün yazma sınırı  
Orijinal başlık ve kabul kriteri: UNKNOWN  
Madde 1: PARTIAL, bu madde onu tamamlanmış saymaz  
Son durum: **PARTIAL**

## Onay çağrı zinciri

`core_approvals` uygulama veritabanındadır. Yazan `controlCenter.createApproval`. Okuyan ve karar veren `controlCenter.decideApproval`. HTTP girişi `POST /api/admin/approvals/:id/decide`. `aiOrchestrator.processTask` aynı fonksiyonu çağırır. Bu yol `orch_approvals` yazmaz.

`orch_approvals` ayrı SQLite dosyasındadır. Yazan `durableTaskQueue.submitApproval`. Karar `decideApproval` içindedir. `humanApproval.createApprovalCenter` ve `orchestrator.approvals` bu kuyruğu kullanır. Pusat `ORCHESTRATE_APPROVE` `runtime.executeReadOnly` üzerinden aynı karara gider. Bu yol `core_approvals` yazmaz.

Aynı karar iki tabloya yazılmıyor. İki tablo iki görev ailesidir: `core_ai_tasks` ve `orch_tasks`. Bu yüzden tablolar birleştirilmedi.

## Bu turda kapanan boşluklar

Aynı `taskId` için ikinci bekleyen `core_approvals` satırı açılmaz. Karar `PENDING` veya `WAITING_APPROVAL` koşuluyla yazılır. Eşzamanlı iki insan kararından biri `ALREADY_DECIDED` alır. `pricing_ai` admin kaydını onaylayamaz. Pusat kuyruğunda karar verici yalnız `human` ve `operator`dır.

Ürün çekirdeği, eski `products` güncellemesi, yerel fiyat satırı ve satış açıkken stok düşümü `guardProjection` kullanır. Madde 30 katalog modülleri yeniden açılmadı.

## Açık kalan

İki karar fonksiyonu duruyor. Düşük riskli Pusat gönderimi satır yazmadan `policy:low-risk` döner. `orchestratorBridge` dış servisin durumunu okur, karar yazmaz. Orijinal kriter UNKNOWN.

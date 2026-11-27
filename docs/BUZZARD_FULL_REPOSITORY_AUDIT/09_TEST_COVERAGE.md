# 09 — Testler

Statik sayım, test kategorisindeki 307 dosyada:

- `it(` eşleşmesi: 1.421
- `test(` eşleşmesi: 316
- `def test_` : 323

Bu üçü birbirinin yerine geçen çağrıları çift sayabilir. Benzersiz test kimliği değildir.

Dosya dağılımı: birim/integration 217, e2e 20, Python 70.


Çalıştırılan güvenli alt küme, 23 Kasım 2026, 22:47 Europe/Berlin:

`vitest run` dört dosya, 19 test, 19 geçti, 0 kaldı. Süre 517 ms.

- `server/__tests__/itemsNinthPass.test.mjs`
- `server/__tests__/itemsEighthPass.test.mjs`
- `server/__tests__/itemsSeventhPass.test.mjs`
- `server/__tests__/remainingLocks.test.mjs`


Tüm `vitest run` ve Playwright çalıştırılmadı. Canlı ödeme, canlı sipariş ve canlı tedarikçi çağrısı yok. Başarısız veya atlanan test bu alt kümede çıkmadı. Diğer dosyaların sonucu bu turda ölçülmedi.


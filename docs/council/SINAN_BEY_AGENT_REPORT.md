# Sinan Bey — kalıcı ajan entegrasyonu (izole)

**Tarih:** 7 Kasım 2026 (Europe/Berlin)  
**Dal:** `cursor/sinan-bey-agent-c293`  
**Push / merge / deploy:** yapılmadı.

## Mevcut durum (önce)

Roster’da `sinan_bey` ve avatar vardı. Pusat görev otobüsü, kişisel sqlite hafıza (`pusat_memories`), toplantı ve Esat izleme zaten vardı. Sesli kanal `CODE_READY`, STT/TTS/SIP **false**. Yedekleme kilidi offsite/WORM olmadan complete değil.

Bu turda Sinan Bey **ajan çalışma zamanı** eklendi; canlı LLM host veya 7/24 süreç iddiası yok.

## Oluşturulan bileşenler

- `server/lib/pusat/sinanInstruction.js` — sistem talimatı / karakter / yasaklar
- `server/lib/pusat/sinanDurable.js` — görev, rapor, denetim tabloları + bellek yedek/geri yükleme
- `server/lib/pusat/sinanBeyAgent.js` — görev kabul, rapor, analiz, Doğu talebi, insan kapısı, toplantı yoklaması, ses/avatar durumu
- Pusat eylemleri: `SINAN_PROFILE`, `SINAN_ASSIGN`, `SINAN_ACCEPT`, `SINAN_REPORT`, `SINAN_ANALYZE`, `SINAN_RESEARCH`, `SINAN_GATE`, `SINAN_VOICE`

## Değiştirilen dosyalar

- `server/lib/pusat/runtime.js` (mevcut dispatch’e eylem eklendi; yazma reddi bozulmadı)
- `server/__tests__/sinanBeyAgent.test.mjs` (yeni)

## Pusat entegrasyon durumu

Pusat `PUSAT_RUNTIME_ENABLED=1` iken Sinan’a görev verebilir; Sinan kabul ve rapor döner. `CREATE_ORDER` hâlâ `PERMISSION_DENIED`. `LIVE_VERIFIED` ajan tarafından set edilemez.

## Hafıza entegrasyonu

Kişisel kayıtlar `pusat_memories.owner_id = sinan_bey`. Başka ajan okuyamaz. Ortak paylaşım `canShare` ile. Bellek karışmaz (test edildi).

## Güvenlik durumu

Git push / merge / deploy / restore / egress / satış / canlı kargo kapıları `WAITING_APPROVAL` + Esat `PERMISSION_DENIED` kaydı. Egress DENY değiştirilmedi. Claude eklenmedi. Gizli anahtar yok.

## Ses ve avatar durumu

Avatar dosyası mevcut. STT/TTS/gerçek zamanlı ses / animasyon: **çalışmıyor** (`assessVoice` false). Altyapı `CODE_READY`. Tamamlanmış değil.

## Test sonuçları

`npx vitest run` Sinan ajan + Pusat/council: **15/15** (7 Kasım 2026 23:38 Europe/Berlin).

Yerel bellek snapshot/restore **test edildi**; offsite/WORM **yok** → kabul maddesi 12 canlı yedekleme olarak **geçmedi**.

## Eksik işler / engeller

1. Hosted 7/24 ajan süreci yok (oturum / Pusat bayrağı).  
2. Canlı STT/TTS/SIP sağlayıcı yok.  
3. Avatar animasyonu yok.  
4. Üretim kod yazımı yok (yalnızca analiz).  
5. Offsite yedek yok.  
6. İnsan onayı olmadan push yok.

## Sonraki aşama

Süleyman Bey: Pusat runtime’ı bilinçli açmak; ses sağlayıcısı seçmek; bu dalı ayrıca onaylarsanız push.

**Tamamlanmış ilan edilmedi.** Çalışan kimlik + görev + hafıza izolasyonu + kapılar **CODE_READY / TESTED**. LIVE_VERIFIED değil.

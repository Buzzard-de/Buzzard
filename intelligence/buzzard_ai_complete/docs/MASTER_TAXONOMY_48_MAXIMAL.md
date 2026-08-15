# BUZZARD MASTER TAXONOMY — 48 MAXIMAL

Kesinleştirilmiş birleşik master taxonomy:

- 48 ana kategori
- 796 alt kategori
- 6.411 alt-alt kategori
- 7.255 toplam taxonomy node

43 doğrulanmış eski ana kategori korunmuş; sonradan ayrı ana kategori olarak
eklenen 5 alan aynı üç seviyeli yapıya normalize edilmiştir:

1. Lastikler – Tüm Motorlu Araçlar
2. Tarım & Tarım Makineleri
3. Hayvancılık
4. Güneş & Rüzgâr Enerjisi
5. İnşaat & İnşaat Makineleri

## CLI

```bash
python3 main.py complete-master-taxonomy-48-health
python3 main.py complete-master-taxonomy-48-demo
python3 main.py complete-master-taxonomy-48-counts
python3 main.py complete-master-taxonomy-48-docs
```

## API

- `GET /master-taxonomy-48/health`
- `GET /master-taxonomy-48/counts`
- `GET /master-taxonomy-48/taxonomy`
- `GET /master-taxonomy-48/main-categories`
- `GET /master-taxonomy-48/search?q=...`
- `GET /master-taxonomy-48/children/{parent_id}`
- `GET /master-taxonomy-48/demo`

## Safety

- `live_activation: false`
- `BUZZARD_SALES_ENABLED=0`
- No live payment or API credentials

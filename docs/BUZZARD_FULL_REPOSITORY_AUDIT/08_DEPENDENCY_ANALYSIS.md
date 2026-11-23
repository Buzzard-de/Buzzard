# 08 — Bağımlılık analizi

İki paket tanımı var. npm workspace alanı yok.

## Kök `package.json`

Runtime:

- `next` ^15.5.29
- `react` ^19.0.0
- `react-dom` ^19.0.0

Development:

- `@playwright/test` ^1.62.1
- `@types/node` ^22.10.0
- `@types/react` ^19.0.0
- `@types/react-dom` ^19.0.0
- `eslint` ^8.57.1
- `eslint-config-next` ^15.5.29
- `typescript` ^5.7.0
- `vitest` ^3.2.7

## `server/package.json`

- `better-sqlite3` ^11.8.1
- `fast-xml-parser` ^5.7.0
- `jsonwebtoken` ^9.0.2

Kök `node_modules` 19.311 dosya. `server/node_modules` 552 dosya. İçlerindeki üçüncü parti kaynak, üretim LOC değildir.

Kullanılmayan bağımlılık ve döngüsel import için bütün graf çalıştırılmadı. Statik importlar envanter CSV'sinin `imports` sütunundadır. Kullanılmadığı kanıtlanmayan dosya, kullanılmıyor diye yazılmadı.


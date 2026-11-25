# Avrupa pazar yeri envanteri

07:34 Europe/Berlin, 25 Kasım 2026. Vitest 3 dosya, 23/23 geçti. Ayrıntı `TEST_RESULTS.md` içindedir.

Kayıt sayısı: 178. Aynı platformun ülke mağazaları tek kayıtta birleştirildi. İsimlerin tamamı testteki listeyle eşleşir.

- `EXISTING_UNTOUCHED`: 9
- `ADAPTER_IMPLEMENTED`: 11
- `RESEARCH_REQUIRED`: 73
- `PARTIAL_API_SUPPORT`: 7
- `SELLER_ACCESS_REQUIRED`: 7
- `NOT_ELIGIBLE`: 56
- `NO_OFFICIAL_API`: 15

Bu tablo canlı bağlantı değildir. `live`, `network` ve `productionReady` bütün kayıtlarda kapalıdır.

| Platform | Listedeki adlar | Ülkeler | Tür | Üçüncü taraf satıcı | Durum | Aile | Doğrulanmış işlem | Kapalı işlem | Kaynak | Not |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amazon | amazon, amazon.at, amazon.nl, amazon.com.be, amazon.pl, amazon.it, amazon.es, amazon.se, amazon uk, amazon.es üzerinden sınır ötesi satış | DE, AT, NL, BE, PL, IT, ES, SE, GB | marketplace | yes | EXISTING_UNTOUCHED | existing | — | createProduct:EXISTING_CONNECTOR_UNTOUCHED; updateProduct:EXISTING_CONNECTOR_UNTOUCHED; updateOffer:EXISTING_CONNECTOR_UNTOUCHED; readOrders:EXISTING_CONNECTOR_UNTOUCHED; updateTracking:EXISTING_CONNECTOR_UNTOUCHED; cancelOrder:EXISTING_CONNECTOR_UNTOUCHED; refund:EXISTING_CONNECTOR_UNTOUCHED | — | Mevcut sandbox connector. Bu görevde dosyasına dokunulmadı. |
| eBay | ebay, ebay.at, ebay.it, ebay uk, ebay motors | DE, AT, IT, GB | marketplace | yes | EXISTING_UNTOUCHED | existing | — | createProduct:EXISTING_CONNECTOR_UNTOUCHED; updateProduct:EXISTING_CONNECTOR_UNTOUCHED; updateOffer:EXISTING_CONNECTOR_UNTOUCHED; readOrders:EXISTING_CONNECTOR_UNTOUCHED; updateTracking:EXISTING_CONNECTOR_UNTOUCHED; cancelOrder:EXISTING_CONNECTOR_UNTOUCHED; refund:EXISTING_CONNECTOR_UNTOUCHED | — | Mevcut sandbox connector. Motors ayrı kod yazılmadı. |
| Kaufland Global Marketplace | kaufland global marketplace, kaufland, kaufland.pl, kaufland.cz, kaufland.sk | DE, AT, PL, CZ, SK | marketplace | yes | EXISTING_UNTOUCHED | existing | — | createProduct:EXISTING_CONNECTOR_UNTOUCHED; updateProduct:EXISTING_CONNECTOR_UNTOUCHED; updateOffer:EXISTING_CONNECTOR_UNTOUCHED; readOrders:EXISTING_CONNECTOR_UNTOUCHED; updateTracking:EXISTING_CONNECTOR_UNTOUCHED; cancelOrder:EXISTING_CONNECTOR_UNTOUCHED; refund:EXISTING_CONNECTOR_UNTOUCHED | — | — |
| Allegro | allegro, allegro.cz, allegro.sk, allegro.hu | PL, CZ, SK, HU | marketplace | yes | EXISTING_UNTOUCHED | existing | — | createProduct:EXISTING_CONNECTOR_UNTOUCHED; updateProduct:EXISTING_CONNECTOR_UNTOUCHED; updateOffer:EXISTING_CONNECTOR_UNTOUCHED; readOrders:EXISTING_CONNECTOR_UNTOUCHED; updateTracking:EXISTING_CONNECTOR_UNTOUCHED; cancelOrder:EXISTING_CONNECTOR_UNTOUCHED; refund:EXISTING_CONNECTOR_UNTOUCHED | — | — |
| bol | bol | NL, BE | marketplace | yes | EXISTING_UNTOUCHED | existing | — | createProduct:EXISTING_CONNECTOR_UNTOUCHED; updateProduct:EXISTING_CONNECTOR_UNTOUCHED; updateOffer:EXISTING_CONNECTOR_UNTOUCHED; readOrders:EXISTING_CONNECTOR_UNTOUCHED; updateTracking:EXISTING_CONNECTOR_UNTOUCHED; cancelOrder:EXISTING_CONNECTOR_UNTOUCHED; refund:EXISTING_CONNECTOR_UNTOUCHED | — | — |
| Cdiscount | cdiscount | FR | marketplace | yes | EXISTING_UNTOUCHED | existing | — | createProduct:EXISTING_CONNECTOR_UNTOUCHED; updateProduct:EXISTING_CONNECTOR_UNTOUCHED; updateOffer:EXISTING_CONNECTOR_UNTOUCHED; readOrders:EXISTING_CONNECTOR_UNTOUCHED; updateTracking:EXISTING_CONNECTOR_UNTOUCHED; cancelOrder:EXISTING_CONNECTOR_UNTOUCHED; refund:EXISTING_CONNECTOR_UNTOUCHED | — | — |
| OTTO | otto | DE | marketplace | yes | EXISTING_UNTOUCHED | existing | — | createProduct:EXISTING_CONNECTOR_UNTOUCHED; updateProduct:EXISTING_CONNECTOR_UNTOUCHED; updateOffer:EXISTING_CONNECTOR_UNTOUCHED; readOrders:EXISTING_CONNECTOR_UNTOUCHED; updateTracking:EXISTING_CONNECTOR_UNTOUCHED; cancelOrder:EXISTING_CONNECTOR_UNTOUCHED; refund:EXISTING_CONNECTOR_UNTOUCHED | — | — |
| eMAG | emag, emag.hu, emag.bg, extreme digital | RO, HU, BG | marketplace | yes | EXISTING_UNTOUCHED | existing | — | createProduct:EXISTING_CONNECTOR_UNTOUCHED; updateProduct:EXISTING_CONNECTOR_UNTOUCHED; updateOffer:EXISTING_CONNECTOR_UNTOUCHED; readOrders:EXISTING_CONNECTOR_UNTOUCHED; updateTracking:EXISTING_CONNECTOR_UNTOUCHED; cancelOrder:EXISTING_CONNECTOR_UNTOUCHED; refund:EXISTING_CONNECTOR_UNTOUCHED | — | Extreme Digital eMAG ile birleşmiş markadır. Ayrı connector yazılmadı. |
| Skroutz | skroutz | GR, CY | marketplace | yes | EXISTING_UNTOUCHED | existing | — | createProduct:EXISTING_CONNECTOR_UNTOUCHED; updateProduct:EXISTING_CONNECTOR_UNTOUCHED; updateOffer:EXISTING_CONNECTOR_UNTOUCHED; readOrders:EXISTING_CONNECTOR_UNTOUCHED; updateTracking:EXISTING_CONNECTOR_UNTOUCHED; cancelOrder:EXISTING_CONNECTOR_UNTOUCHED; refund:EXISTING_CONNECTOR_UNTOUCHED | — | — |
| MediaMarkt Marketplace | mediamarkt marketplace, mediamarkt, saturn, mediamarkt österreich, mediaworld | DE, AT, ES, BE, HU, IT | marketplace | yes | ADAPTER_IMPLEMENTED | mirakl | readOrders, updateOffer, importProducts, updateTracking, shipOrder, cancelOrder, refund | — | https://www.channelpartner.de/article/3902315/jeder-groessere-haendler-sollte-retail-media-anbieter-werden.html | MediaMarktSaturn Mirakl müşterisidir. Saturn ve MediaWorld aynı kayıttadır. Operator host kodda yoktur. |
| Conrad Marketplace | conrad marketplace, conrad | DE | marketplace | yes | ADAPTER_IMPLEMENTED | mirakl | readOrders, updateOffer, importProducts, updateTracking, shipOrder, cancelOrder, refund | — | https://www.channelpartner.de/article/3902315/jeder-groessere-haendler-sollte-retail-media-anbieter-werden.html | — |
| Decathlon Marketplace | decathlon marketplace, decathlon | FR, IT, ES, PT, PL, BE | marketplace | yes | ADAPTER_IMPLEMENTED | mirakl | readOrders, updateOffer, importProducts, updateTracking, shipOrder, cancelOrder, refund | — | https://annuaire.frenchtechbordeaux.com/organisations/mirakl | — |
| Worten | worten | ES, PT | marketplace | yes | ADAPTER_IMPLEMENTED | mirakl | readOrders, updateOffer, importProducts, updateTracking, shipOrder, cancelOrder, refund | — | https://www.mirakl.com/news/worten-launches-marketplace-powered-by-mirakl/ | — |
| Empik | empik | PL | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | Bu turda Empik'in Mirakl kullandığı resmi bir sayfadan doğrulanmadı. |
| Carrefour Marketplace | carrefour marketplace, carrefour, carrefour belgium | FR, BE, ES | marketplace | yes | ADAPTER_IMPLEMENTED | mirakl | readOrders, updateOffer, importProducts, updateTracking, shipOrder, cancelOrder, refund | — | https://www.mirakl.com/news/leroy-merlin-launches-its-european-marketplace/ | — |
| Leroy Merlin Marketplace | leroy merlin marketplace, leroy merlin | FR, IT, ES | marketplace | yes | ADAPTER_IMPLEMENTED | mirakl | readOrders, updateOffer, importProducts, updateTracking, shipOrder, cancelOrder, refund | — | https://www.mirakl.com/news/leroy-merlin-launches-its-european-marketplace/ | — |
| El Corte Inglés | el corte inglés | ES | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | Bu turda operator yazılımı resmi sayfadan doğrulanmadı. |
| Boulanger | boulanger | FR | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | Bu turda Mirakl müşterisi olarak doğrulanmadı. |
| Rue du Commerce | rue du commerce | FR | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| B&Q Marketplace | b&q marketplace | GB | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Etsy | etsy | DE, FR, IT, ES, GB, IE | marketplace | yes | ADAPTER_IMPLEMENTED | etsy | createListing, updateListing, updateInventory, readOrders | uploadImage:IMAGE_ENDPOINT_NOT_CAPTURED; updateTracking:TRACKING_PATH_NOT_CAPTURED; cancelOrder:NOT_IN_CAPTURED_DOC; refund:NOT_IN_CAPTURED_DOC | https://developers.etsy.com/documentation/essentials/urlsyntax/ | — |
| Back Market | back market | FR, DE, ES, IT, BE, NL, AT, GB | marketplace | yes | PARTIAL_API_SUPPORT | backmarket | upsertListing, readOrders, updateOrder | refund:CARE_API_PATH_NOT_CAPTURED | https://api.backmarket.dev/ | İade Care API yolu bu turda resmi belgeden satır satır alınmadı. |
| ManoMano | manomano, manomano uk | FR, DE, ES, IT, GB, BE | marketplace | yes | PARTIAL_API_SUPPORT | manomano | readOrders, readOrder, acceptOrders, refuseOrders, createShipment, refund, readOffers | updateOffer:OFFER_UPDATE_PATH_NOT_CAPTURED; createProduct:PRODUCT_CREATE_PATH_NOT_CAPTURED | https://partnersapi.manomano.com | Sipariş, kargo ve iade yolları resmi Postman kaydından alındı. Fiyat güncellemenin PATCH adresi bu kayıttan çıkmadı. |
| Vinted Pro | vinted, vinted uk | FR, NL, BE, ES, IT, PT, GB | marketplace | yes | PARTIAL_API_SUPPORT | vinted | createItems, updateItems, readOrders, cancelOrder, readShipment, readOntologies | refund:NOT_IN_CAPTURED_DOC; registerWebhook:WEBHOOK_REGISTRATION_BLOCKED | https://pro-docs.svc.vinted.com/ | Yalnızca allowlist Vinted Pro. Tüketici ilan hesabı bu API'yi açmaz. |
| Shöpping.at | shöpping.at | AT | marketplace | yes | PARTIAL_API_SUPPORT | shoepping | readOrders, updateOrder, readReturns | createProduct:PRODUCT_FEED_NOT_REST; updateOffer:PRICE_STOCK_FEED_NOT_REST | https://portal.shoepping.at/ws/v1/orders | Ürün ve fiyat/stok CSV feed. Sipariş REST yolu resmi v1.27 belgesinden alındı. |
| Alza | alza, alza.sk, alza.hu | CZ, SK, HU, AT | marketplace | yes | PARTIAL_API_SUPPORT | alza | readOrders, readUnshipped, readCategories, readCategoryTree, readManufacturers, readTemplates | createProduct:LISTING_WRITE_PATH_NOT_CAPTURED; updateOffer:PRICE_STOCK_PATH_NOT_CAPTURED; updateTracking:SHIPMENT_WRITE_PATH_NOT_CAPTURED; cancelOrder:NOT_IN_CAPTURED_DOC; refund:NOT_IN_CAPTURED_DOC | https://www.alza.cz/alzatrade-api | Sipariş ve kategori şablonu yolları resmi AlzaTrade sayfasından. Ürün yazma yolu o sayfada yok. |
| Refurbed | refurbed | DE, AT | marketplace | yes | PARTIAL_API_SUPPORT | refurbed | readOrders, readInstance | refund:REFUND_RPC_NAME_NOT_CAPTURED; createProduct:INSTANCES_ARE_MANAGED_BY_REFURBED; updateOffer:OFFER_RPC_NOT_CAPTURED | https://gitlab.com/refurbed-community/public-apis/-/blob/master/refurbed_merchant_api/refb/merchant/v1/README.md | Ürün instance'ları Refurbed yönetir. Satıcı kendi katalog kaydını yaratmaz. |
| Galaxus | galaxus, galaxus deutschland, digitec | CH, DE | marketplace | yes | PARTIAL_API_SUPPORT | fileExchange | — | createProduct:FILE_EXCHANGE_ONLY; updateOffer:FILE_EXCHANGE_ONLY; readOrders:FILE_EXCHANGE_ONLY; updateTracking:FILE_EXCHANGE_ONLY; cancelOrder:FILE_EXCHANGE_ONLY; refund:FILE_EXCHANGE_ONLY | https://hypamoon.com/connect-to/galaxus | Herkese açık REST API yok. Resmi yöntem satıcı dosya değişimi. Digitec aynı gruptur. |
| Zalando | zalando, zalando schweiz | DE, AT, CH, FR, NL, BE, IT, ES, PL, SE, NO, FI | marketplace | yes | SELLER_ACCESS_REQUIRED | closed | — | — | https://partner.zalando.com/university/article/integration-options | zDirect API var. Uç listesi partner onayı olmadan kamuya açık değil. Uç yazılmadı. |
| Temu | temu | DE | marketplace | yes | SELLER_ACCESS_REQUIRED | closed | — | — | https://partner.temu.com/documentation | Partner Platform kapısı doğrulandı. Endpoint listesi kopyalanmadı. |
| SHEIN Marketplace | shein marketplace | DE | marketplace | yes | SELLER_ACCESS_REQUIRED | closed | — | — | https://open.sheincorp.com/ | Open Platform ürün ve sipariş çözümlerini anlatıyor. Endpoint listesi kopyalanmadı. |
| TikTok Shop | tiktok shop, tiktok shop uk | GB | marketplace | yes | SELLER_ACCESS_REQUIRED | closed | — | — | https://partner.tiktokshop.com/docv2/page/seller-api-overview | Seller API genel bakışı doğrulandı. Ülke uçları kopyalanmadı. |
| Wayfair | wayfair uk, wayfair | GB, DE | marketplace | yes | SELLER_ACCESS_REQUIRED | closed | — | — | https://developer.wayfair.io/ | Tedarikçi API portalı doğrulandı. GraphQL alanları kopyalanmadı. |
| Hood.de | hood.de | DE | marketplace | yes | SELLER_ACCESS_REQUIRED | closed | — | — | https://www.hood.de/tips/1246/einstellen-per-schnittstelle-api-.htm | Platin mağaza API'si var. Herkese açık endpoint listesi yok. |
| OnBuy | onbuy | GB | marketplace | yes | SELLER_ACCESS_REQUIRED | closed | — | — | https://docs.api.onbuy.com/ | Herkese açık /v2 belgeleri var. Bu turda yol listesi koda alınmadı. |
| Fnac Darty | fnac darty, fnac, darty, fnac portugal, fnac belgium | FR, PT, BE, ES | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | Satıcı API'si entegratör notlarında geçiyor. Resmi XML yolları bu turda Fnac belgesinden alınmadı. |
| PcComponentes | pccomponentes | ES | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Morele.net | morele.net | PL | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Ricardo | ricardo | CH | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Fruugo | fruugo | GB | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | Satıcı ürün aktarımı biliniyor. Resmi yol bu turda alınmadı. |
| Rakuten France | rakuten france | FR | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | — |
| La Redoute | la redoute | FR, IT | marketplace | yes | ADAPTER_IMPLEMENTED | mirakl | readOrders, updateOffer, importProducts, updateTracking, shipOrder, cancelOrder, refund | — | https://www.mirakl.com/blogs/marketplace/mirakl-achieves-record-gmv-growth-extends-sizable-lead-in-the-enterprise-marketplace-category-in-2020/ | Mirakl 2020 müşteri duyurusunda La Redoute geçiyor. Host kodda sabit değildir. |
| ABOUT YOU | about you | DE | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | — |
| Spartoo | spartoo | FR | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | — |
| CDON | cdon | SE, DK, NO, FI | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | — |
| Reverb | reverb | DE | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | — |
| Wish | wish | DE | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Alibaba.com | alibaba.com | DE | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | B2B platform. Avrupa tüketici mağazası değil. |
| AliExpress | aliexpress | ES | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | — |
| Miravia | miravia | ES | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | — |
| Mall | mall.cz, mall.sk, mall.hr | CZ, SK, HR | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | Allegro grubu. Mevcut Allegro connector'ına bağlanmadı. |
| ePRICE | eprice | IT | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Erli | erli | PL | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Fyndiq | fyndiq | SE | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Home24 | home24 | DE | marketplace | yes | ADAPTER_IMPLEMENTED | mirakl | readOrders, updateOffer, importProducts, updateTracking, shipOrder, cancelOrder, refund | — | https://www.channelpartner.de/article/3902315/jeder-groessere-haendler-sollte-retail-media-anbieter-werden.html | ChannelPartner, 23 Temmuz 2024, Home24'ü Mirakl müşterisi olarak sayıyor. Host sabit değildir. |
| Modivo | modivo | PL | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Sportano | sportano | PL | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Tradeinn | tradeinn | ES | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Pigu | pigu.lt | LT | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | — |
| 220.lv | 220.lv | LV | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | — |
| Kaup24 | kaup24 | EE | marketplace | yes | RESEARCH_REQUIRED | closed | — | — | — | — |
| 1a | 1a.lt, 1a.lv, 1a.ee | LT, LV, EE | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Varle | varle.lt | LT | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Ananas | ananas | RS | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Fashion Days | fashion days | RO, BG | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Daparto | daparto | DE | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Motointegrator | motointegrator | DE | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Heureka | heureka, heureka.sk | CZ, SK | comparison | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Ceneo | ceneo | PL | comparison | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| BestPrice | bestprice | GR | comparison | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Pazaruvaj | pazaruvaj | BG | comparison | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| KuantoKusta | kuantokusta | PT | comparison | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| ASOS Marketplace | asos marketplace | GB | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Depop | depop | GB | classified | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Privalia | privalia | ES | club | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Veepee | veepee | FR | club | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Limango | limango | DE | club | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Tradera | tradera | SE | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Aukro | aukro | CZ | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Vatera | vatera | HU | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Limundo | limundo | RS | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Pepita | pepita | HU | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Shopflix | shopflix | GR | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Vendora | vendora | GR | classified | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| CEL.ro | cel.ro | RO | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Altex | altex | RO | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Ozone.bg | ozone.bg | BG | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| eKupi | ekupi | HR | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| eCipele | ecipele | SI | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Hansapost | hansapost | EE | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Komplett | komplett | NO | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Boozt | boozt | SE, DK, NO | retailer | no | NOT_ELIGIBLE | closed | — | — | — | Kendi perakende stoğu. Üçüncü taraf satıcı kanalı bu turda doğrulanmadı. |
| Coolblue | coolblue | NL, BE | retailer | no | NOT_ELIGIBLE | closed | — | — | — | Kendi perakende mağazası. Açık satıcı pazaryeri değil. |
| Wehkamp | wehkamp | NL | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Blokker | blokker | NL | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| VidaXL | vidaxl | NL | retailer | no | NOT_ELIGIBLE | closed | — | — | — | VidaXL kendi ürününü satar. Buzzard'ın içine ürün koyacağı açık pazar yeri değil. |
| Praxis | praxis | NL | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Leen Bakker | leen bakker | NL | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| HEMA | hema | NL | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Vanden Borre | vanden borre | BE | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Krëfel | krëfel | BE | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Brico | brico | BE | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Media Expert | media expert | PL | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| RTV Euro AGD | rtv euro agd | PL | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Datart | datart | CZ | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Rohlik | rohlik | CZ | retailer | no | NOT_ELIGIBLE | closed | — | — | — | Online market. Üçüncü taraf genel ürün pazaryeri değil. |
| Nay | nay.sk | SK | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Flanco | flanco | RO | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Elefant | elefant | RO | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Technopolis | technopolis | BG | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Sancta Domenica | sancta domenica | HR | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Mimovrste | mimovrste | SI | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Merkur | merkur | SI | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Gigatron | gigatron | RS | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Unieuro | unieuro | IT | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| IBS | ibs | IT | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Thalia | thalia | DE | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| XXXLutz | xxxlutz | AT | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Universal.at | universal.at | AT | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Manor | manor | CH | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Migros | migros | CH | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Coop | coop | CH | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Brack.ch | brack.ch | CH | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Ochsner Sport | ochsner sport | CH | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Ubaldi | ubaldi | FR | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Pixmania | pixmania | FR | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| MacWay | macway | FR | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Public | public.gr, public cyprus | GR, CY | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Plaisio | plaisio | GR | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Stephanis | stephanis | CY | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Electroline | electroline | CY | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Elgiganten | elgiganten | SE, DK | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Elkjøp | elkjøp | NO | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Gigantti | gigantti | FI | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Verkkokauppa.com | verkkokauppa.com | FI | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Prisma | prisma | FI | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Åhléns | åhléns | SE | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Matas | matas | DK | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Bilka | bilka | DK | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Proshop | proshop | DK | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| RD Electronics | rd electronics | LV | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Argos | argos | GB | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Very | very | GB | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Dunelm | dunelm | GB | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Screwfix | screwfix | GB | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Brown Thomas | brown thomas | IE | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Littlewoods Ireland | littlewoods ireland | IE | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| PCDIGA | pcdiga | PT | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Continente | continente | PT | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Douglas Marketplace | douglas marketplace | DE | marketplace | yes | ADAPTER_IMPLEMENTED | mirakl | readOrders, updateOffer, importProducts, updateTracking, shipOrder, cancelOrder, refund | — | https://www.channelpartner.de/article/3902315/jeder-groessere-haendler-sollte-retail-media-anbieter-werden.html | — |
| Hornbach | hornbach | DE | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Bauhaus | bauhaus | DE | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| OBI | obi | DE | retailer | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Avocadostore | avocadostore | DE | marketplace | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Zooplus | zooplus | DE | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Bitiba | bitiba | DE | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Fressnapf | fressnapf | DE | marketplace | yes | ADAPTER_IMPLEMENTED | mirakl | readOrders, updateOffer, importProducts, updateTracking, shipOrder, cancelOrder, refund | — | https://www.channelpartner.de/article/3902315/jeder-groessere-haendler-sollte-retail-media-anbieter-werden.html | — |
| Thomann | thomann | DE | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Bax Music | bax music | NL | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Oscaro | oscaro | FR | retailer | no | NOT_ELIGIBLE | closed | — | — | — | — |
| Kleinanzeigen | kleinanzeigen | DE | classified | no | NO_OFFICIAL_API | closed | — | — | — | İlan sitesi. Katalog satıcı API'si bulunamadı. |
| willhaben | willhaben | AT | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| Leboncoin | leboncoin | FR | classified | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Marktplaats | marktplaats | NL | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| 2dehands | 2dehands | BE | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| OLX | olx polska, olx.ro, olx.bg, olx portugal | PL, RO, BG, PT | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| Subito | subito | IT | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| Wallapop | wallapop | ES | classified | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Njuškalo | njuškalo | HR | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| Bolha | bolha | SI | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| Bazaraki | bazaraki | CY | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| FINN | finn | NO | classified | unknown | RESEARCH_REQUIRED | closed | — | — | — | — |
| Tori.fi | tori.fi | FI | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| DBA | dba | DK | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| Adverts.ie | adverts.ie | IE | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| DoneDeal | donedeal | IE | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| KupujemProdajem | kupujemprodajem | RS | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |
| Osta.ee | osta.ee | EE | classified | no | NO_OFFICIAL_API | closed | — | — | — | — |

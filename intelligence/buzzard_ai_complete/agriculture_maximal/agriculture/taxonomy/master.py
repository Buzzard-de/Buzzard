# Maximum agriculture ecosystem: machines, spare parts, equipment, consumables.
AGRICULTURE_TAXONOMY = {
 "tractor": {
   "name":"Traktörler",
   "subcategories":{
     "compact":{"name":"Kompakt / Bağ / Bahçe Traktörleri","sub_sub":["Motor","Şanzıman","Hidrolik","Elektrik","Fren","Direksiyon","Kabin","PTO","3 Nokta Askı"]},
     "standard":{"name":"Standart Traktörler","sub_sub":["Motor","Yakıt","Soğutma","Debriyaj","Şanzıman","Diferansiyel","Aks","Fren","Hidrolik","PTO","Elektrik","Kabin"]},
     "row_crop":{"name":"Sıra Arası Traktörler","sub_sub":["Dar Aks","Hidrolik","Ön Yükleyici","PTO","Lastik"]},
     "high_power":{"name":"Yüksek Güçlü Traktörler","sub_sub":["Motor","Turbo","Şanzıman","Hidrolik","Aktarma","Elektronik"]},
     "crawler":{"name":"Paletli Traktörler","sub_sub":["Palet","Yürüyüş Sistemi","Final Drive","Hidrolik","Bıçak"]},
     "specialty":{"name":"Özel Amaçlı Traktörler","sub_sub":["Bağ","Bahçe","Sera","Dar Gövde"]}
   }
 },
 "combine_harvester":{"name":"Biçerdöverler","subcategories":{
   "cutting":{"name":"Kesim & Biçme","sub_sub":["Biçer Bıçakları","Parmaklar","Tabla Parçaları","Makara"]},
   "threshing":{"name":"Döven & Harmanlama","sub_sub":["Batör","Kontrbatör","Elek","Rotor","Rasp Bar"]},
   "cleaning":{"name":"Temizleme","sub_sub":["Fan","Elek","Hava Sistemi"]},
   "grain_handling":{"name":"Dane Aktarma","sub_sub":["Elevatör","Helezon","Zincir","Rulman"]},
   "engine":{"name":"Motor & Aktarma","sub_sub":["Motor","Turbo","Soğutma","Şanzıman"]}
 }},
 "baler":{"name":"Balya Makineleri","subcategories":{
   "round":{"name":"Rulo Balya","sub_sub":["Pickup","Bağlama","Rulo Mekanizması","Zincir"]},
   "square":{"name":"Kare Balya","sub_sub":["Pickup","İğne","Düğümleyici","Piston"]},
   "wrapping":{"name":"Balya Sarma","sub_sub":["Film Sistemi","Streç","Kesme"]},
 }},
 "mower":{"name":"Biçme Makineleri","subcategories":{
   "disc":{"name":"Diskli Biçme","sub_sub":["Disk","Bıçak","Kayış","Şaft"]},
   "drum":{"name":"Tamburlu Biçme","sub_sub":["Tambur","Bıçak","Şanzıman"]},
   "conditioner":{"name":"Biçme & Kondisyoner","sub_sub":["Kondisyoner","Silindir","Parmak"]},
 }},
 "seeding":{"name":"Ekim Makineleri","subcategories":{
   "grain":{"name":"Hububat Ekim","sub_sub":["Mibzer Ünitesi","Disk","Gübre Ünitesi","Tohum Borusu"]},
   "precision":{"name":"Hassas Ekim","sub_sub":["Ekim Ünitesi","Vakum","Disk","Tohum Sensörü"]},
   "planter":{"name":"Dikim Makineleri","sub_sub":["Fide Ünitesi","Bant","Vakum","Sıra Ünitesi"]}
 }},
 "fertilizer":{"name":"Gübreleme Makineleri","subcategories":{
   "broadcast":{"name":"Santrifüj Gübre Serpme","sub_sub":["Disk","Kanat","Dozaj","Redüktör"]},
   "precision":{"name":"Hassas Gübreleme","sub_sub":["Dozaj Ünitesi","Sensör","Kontrol"]},
   "liquid":{"name":"Sıvı Gübre","sub_sub":["Pompa","Nozul","Filtre","Hortum"]}
 }},
 "spraying":{"name":"İlaçlama Makineleri","subcategories":{
   "field":{"name":"Tarla Pülverizatörleri","sub_sub":["Pompa","Nozul","Filtre","Regülatör","Boom"]},
   "orchard":{"name":"Bahçe Atomizörleri","sub_sub":["Fan","Pompa","Nozul","Depo"]},
   "self_propelled":{"name":"Kendinden Yürür","sub_sub":["Pompa","Boom","Elektronik","Hidrostatik"]}
 }},
 "soil":{"name":"Toprak İşleme Makineleri","subcategories":{
   "plough":{"name":"Pulluklar","sub_sub":["Kulak","Bıçak","Saban Ucu","Bağlantı"]},
   "disc_harrow":{"name":"Diskarolar","sub_sub":["Disk","Makaralar","Rulman","Şase"]},
   "cultivator":{"name":"Kültivatörler","sub_sub":["Ayak","Bıçak","Yay","Merdane"]},
   "rotary":{"name":"Rotovatörler","sub_sub":["Bıçak","Rotor","Şanzıman","PTO"]},
   "subsoiler":{"name":"Dipkazanlar","sub_sub":["Ayak","Uç","Şase"]}
 }},
 "harvesting":{"name":"Hasat Makineleri","subcategories":{
   "corn":{"name":"Mısır Hasat","sub_sub":["Tabla","Bıçak","Zincir","Şanzıman"]},
   "potato":{"name":"Patates Hasat","sub_sub":["Elek","Bant","Zincir","Ayırıcı"]},
   "beet":{"name":"Pancar Hasat","sub_sub":["Sökücü","Temizleme","Aktarma"]},
   "forage":{"name":"Yem Hasat","sub_sub":["Kesici","Pickup","Rotor","Üfleme"]},
 }},
 "hay_feed":{"name":"Yem & Hayvancılık Makineleri","subcategories":{
   "mixer":{"name":"Yem Karma Makineleri","sub_sub":["Helezon","Bıçak","Redüktör","Load Cell"]},
   "feeders":{"name":"Yemleme Sistemleri","sub_sub":["Konveyör","Helezon","Dozaj"]},
   "silage":{"name":"Silaj Makineleri","sub_sub":["Kesici","Pickup","Rotor","Bıçak"]}
 }},
 "trailers":{"name":"Tarım Römorkları & Taşıma","subcategories":{
   "trailer":{"name":"Römorklar","sub_sub":["Dingil","Fren","Kasa","Hidrolik"]},
   "tipper":{"name":"Damperli Römork","sub_sub":["Hidrolik Silindir","Kasa","Kilit"]},
   "platform":{"name":"Platform Taşıyıcılar","sub_sub":["Şase","Aks","Rampalar"]}
 }},
 "irrigation":{"name":"Sulama Sistemleri & Ekipmanları","subcategories":{
   "drip":{"name":"Damla Sulama","sub_sub":["Damlatıcı","Boru","Filtre","Vana","Bağlantı"]},
   "sprinkler":{"name":"Yağmurlama","sub_sub":["Sprinkler","Boru","Pompa","Vana"]},
   "pump":{"name":"Sulama Pompaları","sub_sub":["Santrifüj","Dalgıç","Motor","Kontrol"]},
   "filtration":{"name":"Filtrasyon","sub_sub":["Disk","Kum","Elek","Hidro-Siklon"]}
 }},
 "greenhouse":{"name":"Sera & Kontrollü Tarım","subcategories":{
   "structure":{"name":"Sera Yapısı","sub_sub":["Profil","Bağlantı","Kapı","Havalandırma"]},
   "cover":{"name":"Örtü & Film","sub_sub":["PE Film","Örtü","Gölgeleme"]},
   "climate":{"name":"İklimlendirme","sub_sub":["Fan","Isıtma","Soğutma","Nemlendirme"]},
   "automation":{"name":"Sera Otomasyonu","sub_sub":["Sensör","Kontrolör","Aktüatör"]}
 }},
 "orchard_vineyard":{"name":"Bağ & Bahçe Makineleri","subcategories":{
   "pruning":{"name":"Budama","sub_sub":["Budama Makası","Testere","Elektrikli Budama"]},
   "shredder":{"name":"Dal Öğütücüler","sub_sub":["Bıçak","Rotor","Motor"]},
   "harvester":{"name":"Meyve Hasat","sub_sub":["Titreşim","Toplama","Konveyör"]},
   "cultivation":{"name":"Bahçe Toprak İşleme","sub_sub":["Freze","Kültivatör","Çapa"]}
 }},
 "spare_parts":{"name":"Tarım Makineleri Yedek Parçaları","subcategories":{
   "engine":{"name":"Motor Parçaları","sub_sub":["Piston","Segman","Gömlek","Conta","Krank","Eksantrik","Supap","Turbo"]},
   "fuel":{"name":"Yakıt Sistemi","sub_sub":["Enjektör","Yakıt Pompası","Filtre","Depo"]},
   "cooling":{"name":"Soğutma","sub_sub":["Radyatör","Su Pompası","Termostat","Fan"]},
   "transmission":{"name":"Şanzıman & Aktarma","sub_sub":["Dişli","Rulman","Senkromeç","Debriyaj","Diferansiyel"]},
   "hydraulic":{"name":"Hidrolik","sub_sub":["Pompa","Valf","Silindir","Hortum","Rakor"]},
   "pto":{"name":"PTO & Şaft","sub_sub":["PTO Mili","Kavrama","Koruyucu","Kardan"]},
   "electrical":{"name":"Elektrik & Elektronik","sub_sub":["Alternatör","Marş","Akü","Sensör","ECU","Kablo"]},
   "brakes":{"name":"Fren","sub_sub":["Balata","Disk","Kampana","Silindir"]},
   "steering":{"name":"Direksiyon","sub_sub":["Pompa","Direksiyon Kutusu","Rot","Rot Başı"]},
   "filters":{"name":"Filtreler","sub_sub":["Hava","Yağ","Yakıt","Hidrolik","Kabin"]},
   "belts_bearings":{"name":"Kayışlar & Rulmanlar","sub_sub":["V-Kayış","Triger","Zincir","Rulman","Gergi"]},
   "cutting_wear":{"name":"Kesici & Aşınma Parçaları","sub_sub":["Bıçak","Saban Ucu","Disk","Diş","Kazıyıcı"]},
   "body_cabin":{"name":"Kabin & Gövde","sub_sub":["Cam","Kapı","Ayna","Koltuk","Çamurluk"]},
   "lighting":{"name":"Aydınlatma","sub_sub":["Far","Stop","Sinyal","LED","Ampul"]}
 }},
 "consumables":{"name":"Tarım Makinesi Sarf & Bakım Ürünleri","subcategories":{
   "lubricants":{"name":"Yağlar & Gresler","sub_sub":["Motor Yağı","Hidrolik Yağ","Şanzıman Yağı","Diferansiyel Yağı","Gres"]},
   "fluids":{"name":"Sıvılar","sub_sub":["Antifriz","Fren Hidroliği","Cam Suyu","AdBlue"]},
   "filters":{"name":"Filtreler","sub_sub":["Motor","Yakıt","Hava","Hidrolik","Kabin"]},
   "fasteners":{"name":"Bağlantı & Montaj","sub_sub":["Civata","Somun","Pul","Pim","Segman"]},
   "seals":{"name":"Keçe & Contalar","sub_sub":["O-Ring","Yağ Keçesi","Conta Seti"]},
 }},
 "implements":{"name":"Tarım Ekipmanları","subcategories":{
   "front_loader":{"name":"Ön Yükleyici Ekipmanları","sub_sub":["Kepçe","Çatal","Balya Ataşmanı"]},
   "three_point":{"name":"3 Nokta Ekipmanları","sub_sub":["Kaldırma","Bağlantı","Askı"]},
   "pto":{"name":"PTO Ekipmanları","sub_sub":["Şaft","Pompa","Jeneratör"]},
   "hydraulic":{"name":"Hidrolik Ekipmanlar","sub_sub":["Valf","Hortum","Silindir","Hızlı Bağlantı"]},
 }},
 "tools":{"name":"Tarım El Aletleri & Atölye","subcategories":{
   "hand":{"name":"El Aletleri","sub_sub":["Budama","Kesme","Çapa","Kürek"]},
   "workshop":{"name":"Atölye Ekipmanları","sub_sub":["Kriko","Pres","Kompresör","Kaynak"]},
   "diagnostics":{"name":"Diagnostik","sub_sub":["Traktör Diagnostik","OBD/ECU","Test Cihazları"]}
 }}
}

# Explicit machine brands/models are data, not hardcoded here. They are ingested
# from licensed/OEM/supplier sources and verified Buzzard catalog data.

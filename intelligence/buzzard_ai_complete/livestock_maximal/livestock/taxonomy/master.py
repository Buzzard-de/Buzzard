# Separate main category: HAYVANCILIK
# Maximum taxonomy organized around animal type + need + equipment/product.

LIVESTOCK_TAXONOMY = {
 "cattle":{"name":"Büyükbaş Hayvancılık","subcategories":{
   "dairy":{"name":"Süt Sığırcılığı","sub_sub":["Sağım","Süt Soğutma","Yemleme","Sulama","Ahır","Hijyen","Buzağı Ekipmanları"]},
   "beef":{"name":"Besi Sığırcılığı","sub_sub":["Yemleme","Sulama","Barınak","Gübre Yönetimi","Hayvan Taşıma"]},
   "calves":{"name":"Buzağı Yetiştiriciliği","sub_sub":["Buzağı Kulübeleri","Süt Besleme","Otomatik Besleyici","Suluk","Isıtma"]},
   "breeding":{"name":"Damızlık","sub_sub":["Barınak","Yemleme","Kimliklendirme","Üreme Yönetimi Ekipmanları"]}
 }},
 "sheep_goat":{"name":"Koyun & Keçi Yetiştiriciliği","subcategories":{
   "sheep":{"name":"Koyunculuk","sub_sub":["Yemleme","Sulama","Ağıl","Kırkım","Taşıma","Kuzu Ekipmanları"]},
   "goat":{"name":"Keçicilik","sub_sub":["Yemleme","Sulama","Barınak","Sağım","Oğlak Ekipmanları"]},
   "milking":{"name":"Koyun/Keçi Sağım","sub_sub":["Sağım Ünitesi","Vakum","Süt Hattı","Hortum","Süt Soğutma"]}
 }},
 "poultry":{"name":"Kanatlı Hayvancılık","subcategories":{
   "chicken":{"name":"Tavukçuluk","sub_sub":["Etlik","Yumurtacı","Kümes","Yemleme","Sulama","Aydınlatma","Havalandırma"]},
   "turkey":{"name":"Hindi Yetiştiriciliği","sub_sub":["Kümes","Yemleme","Sulama","İklimlendirme"]},
   "duck_goose":{"name":"Ördek & Kaz","sub_sub":["Barınak","Sulama","Yemleme","Kuluçka"]},
   "quail":{"name":"Bıldırcın","sub_sub":["Kafes","Yemleme","Sulama","Yumurta Ekipmanları"]},
   "incubation":{"name":"Kuluçka","sub_sub":["Kuluçka Makineleri","Yumurta Tepsileri","Nemlendirme","Isıtma","Kontrol"]}
 }},
 "pig":{"name":"Domuz Yetiştiriciliği","subcategories":{
   "housing":{"name":"Barınak","sub_sub":["Bölmeler","Zemin","Kapılar","Havalandırma"]},
   "feeding":{"name":"Yemleme","sub_sub":["Otomatik Yemlik","Yem Hattı","Silo"]},
   "watering":{"name":"Sulama","sub_sub":["Nipel Suluk","Su Hattı","Filtre"]},
   "manure":{"name":"Gübre Yönetimi","sub_sub":["Sıyırıcı","Pompa","Depolama"]}
 }},
 "horse":{"name":"At & Binicilik","subcategories":{
   "stable":{"name":"Ahır & Tavla","sub_sub":["Bölmeler","Kapılar","Yemlik","Suluk","Zemin"]},
   "care":{"name":"At Bakımı","sub_sub":["Tımar","Fırça","Bakım Ekipmanları","Toynak Bakımı"]},
   "riding":{"name":"Binicilik","sub_sub":["Eyer","Dizgin","Üzengi","Binici Ekipmanları"]},
   "transport":{"name":"At Taşıma","sub_sub":["At Römorku","Bağlama","Rampalar"]}
 }},
 "beekeeping":{"name":"Arıcılık","subcategories":{
   "hives":{"name":"Kovanlar","sub_sub":["Langstroth","Dadant","Ahşap","Polen Tuzaklı"]},
   "frames":{"name":"Çerçeve & Temel Petek","sub_sub":["Çerçeve","Temel Petek","Tel","Kovan Parçaları"]},
   "feeding":{"name":"Arı Besleme","sub_sub":["Şurup Besleyici","Kek Besleyici","Besleme Kapları"]},
   "harvesting":{"name":"Bal Hasat","sub_sub":["Bal Süzme","Santrifüj","Süzgeç","Dinlendirme"]},
   "protective":{"name":"Arıcılık Koruyucu Ekipmanları","sub_sub":["Arıcı Elbisesi","Eldiven","Maske","Körük","El Aletleri"]}
 }},
 "aquaculture":{"name":"Balıkçılık & Akuakültür","subcategories":{
   "pond":{"name":"Havuz Sistemleri","sub_sub":["Havuz","Kaplama","Giriş/Çıkış"]},
   "water":{"name":"Su Yönetimi","sub_sub":["Pompa","Filtre","Oksijenlendirme","UV"]},
   "feeding":{"name":"Yemleme","sub_sub":["Otomatik Yemleyici","Yem Deposu","Dozaj"]},
   "hatchery":{"name":"Kuluçkahane","sub_sub":["Tank","Oksijen","Filtrasyon","Kontrol"]}
 }},
 "housing":{"name":"Hayvan Barınakları & Çiftlik Sistemleri","subcategories":{
   "barn":{"name":"Ahır Sistemleri","sub_sub":["Bölmeler","Kapılar","Yemlik","Suluk","Zemin"]},
   "fencing":{"name":"Çit & Güvenlik","sub_sub":["Elektrikli Çit","Tel Çit","Direk","İzolatör"]},
   "ventilation":{"name":"Havalandırma","sub_sub":["Fan","Hava Girişi","Kontrol"]},
   "climate":{"name":"Isıtma & Soğutma","sub_sub":["Isıtıcı","Fan","Soğutma","Kontrol"]},
   "lighting":{"name":"Aydınlatma","sub_sub":["LED","Kümes Aydınlatması","Zamanlayıcı"]}
 }},
 "feeding":{"name":"Yemleme Sistemleri","subcategories":{
   "feeders":{"name":"Yemlikler","sub_sub":["Büyükbaş","Küçükbaş","Kanatlı","At","Otomatik"]},
   "mixing":{"name":"Yem Karma & Hazırlama","sub_sub":["Yem Karma","Helezon","Kesici","Dozaj"]},
   "distribution":{"name":"Yem Dağıtım","sub_sub":["Yem Arabası","Konveyör","Helezon","Robotik"]},
   "storage":{"name":"Yem Depolama","sub_sub":["Silo","Hazne","Bunker","Helezon"]}
 }},
 "watering":{"name":"Sulama & Hayvan İçme Sistemleri","subcategories":{
   "drinkers":{"name":"Suluklar","sub_sub":["Nipel","Şamandıralı","Kase","Otomatik"]},
   "water_lines":{"name":"Su Hatları","sub_sub":["Boru","Hortum","Vana","Bağlantı"]},
   "filtration":{"name":"Su Filtrasyonu","sub_sub":["Disk","Elek","Karbon"]},
   "pumps":{"name":"Su Pompaları","sub_sub":["Santrifüj","Dalgıç","Basınç"]},
 }},
 "milking":{"name":"Sağım Sistemleri","subcategories":{
   "milking_units":{"name":"Sağım Üniteleri","sub_sub":["Tekli","Çoklu","Mobil"]},
   "vacuum":{"name":"Vakum Sistemleri","sub_sub":["Vakum Pompası","Regülatör","Vakum Tankı"]},
   "milk_lines":{"name":"Süt Hattı","sub_sub":["Hortum","Boru","Pençe","Contalar"]},
   "cooling":{"name":"Süt Soğutma","sub_sub":["Süt Tankı","Soğutma Ünitesi","Karıştırıcı"]},
   "hygiene":{"name":"Sağım Hijyeni","sub_sub":["Temizlik","Dezenfeksiyon","Daldırma Sistemleri"]}
 }},
 "manure":{"name":"Gübre & Atık Yönetimi","subcategories":{
   "scrapers":{"name":"Gübre Sıyırıcıları","sub_sub":["Zincirli","Halatlı","Hidrolik"]},
   "pumps":{"name":"Gübre Pompaları","sub_sub":["Dalgıç","Kesicili","Vakum"]},
   "mixing":{"name":"Karıştırma","sub_sub":["Mixer","Agitatör","Pervane"]},
   "storage":{"name":"Depolama","sub_sub":["Gübre Çukuru","Tank","Lagün"]},
   "separation":{"name":"Ayırma","sub_sub":["Katı/Sıvı Ayırıcı","Filtre","Pres"]}
 }},
 "animal_health_equipment":{"name":"Hayvan Sağlığı Ekipmanları","subcategories":{
   "handling":{"name":"Hayvan Muayene & Sabitleme","sub_sub":["Hayvan Yakalama","Sıkıştırma","Muayene Masası"]},
   "identification":{"name":"Kimliklendirme","sub_sub":["Kulak Küpesi","RFID","Elektronik Kimlik"]},
   "monitoring":{"name":"İzleme & Sensörler","sub_sub":["Aktivite","Geviş","Sıcaklık","Konum"]},
   "farm_hygiene":{"name":"Çiftlik Hijyeni","sub_sub":["Dezenfeksiyon","Temizlik","Ayak Banyosu"]}
 }},
 "transport":{"name":"Hayvan Taşıma","subcategories":{
   "trailers":{"name":"Hayvan Römorkları","sub_sub":["Büyükbaş","Küçükbaş","At"]},
   "loading":{"name":"Yükleme Ekipmanları","sub_sub":["Rampa","Kapı","Bariyer"]},
   "restraint":{"name":"Sabitleme","sub_sub":["Bölme","Bağlama","Güvenlik"]}
 }},
 "machinery":{"name":"Hayvancılık Makineleri & Yedek Parçaları","subcategories":{
   "feed_mixer_parts":{"name":"Yem Karma Makinesi Parçaları","sub_sub":["Helezon","Bıçak","Redüktör","Rulman","Motor"]},
   "milking_parts":{"name":"Sağım Makinesi Parçaları","sub_sub":["Vakum Pompası","Pulsatör","Pençe","Hortum","Conta"]},
   "manure_parts":{"name":"Gübre Ekipmanı Parçaları","sub_sub":["Pompa","Sıyırıcı","Zincir","Motor"]},
   "ventilation_parts":{"name":"Havalandırma Parçaları","sub_sub":["Fan Motoru","Pervane","Panjur","Kontrol"]},
   "feeding_parts":{"name":"Yemleme Sistemi Parçaları","sub_sub":["Motor","Helezon","Dozaj","Sensör"]},
   "water_parts":{"name":"Sulama/Suluk Parçaları","sub_sub":["Nipel","Valf","Pompa","Filtre","Hortum"]}
 }},
 "consumables":{"name":"Hayvancılık Sarf & Bakım","subcategories":{
   "cleaning":{"name":"Temizlik & Hijyen","sub_sub":["Sağım Temizleyici","Dezenfektan","Fırça","Bez"]},
   "maintenance":{"name":"Bakım","sub_sub":["Yağ","Gres","Kayış","Rulman","Keçe","Conta"]},
   "replacement":{"name":"Sarf Parçalar","sub_sub":["Hortum","Filtre","Nozul","Valf","Bağlantı"]}
 }},
 "automation":{"name":"Akıllı Çiftlik & Hayvancılık Otomasyonu","subcategories":{
   "sensors":{"name":"Sensörler","sub_sub":["Sıcaklık","Nem","Aktivite","Su Tüketimi","Yem Tüketimi"]},
   "controllers":{"name":"Kontrol Sistemleri","sub_sub":["PLC","Kontrol Paneli","Gateway"]},
   "robotics":{"name":"Robotik Sistemler","sub_sub":["Sağım Robotu","Yemleme Robotu","Gübre Robotu"]},
   "software":{"name":"Çiftlik Yazılımı & İzleme","sub_sub":["Hayvan Takibi","Sürü Yönetimi","Yem Yönetimi","Üretim Takibi"]}
 }}
}

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

TAXONOMY = {'solar': {'name': 'Güneş Enerjisi', 'subcategories': {'panels': {'name': 'Güneş Panelleri', 'sub_sub': ['Monokristal', 'Polikristal', 'Bifacial', 'Esnek Paneller', 'Taşınabilir Paneller', 'Cam-Cam Paneller', 'Çatı Panelleri', 'Arazi Panelleri']}, 'inverters': {'name': 'Solar İnverterler', 'sub_sub': ['On-Grid', 'Off-Grid', 'Hybrid', 'Mikro İnverter', 'String İnverter', 'Merkezi İnverter']}, 'storage': {'name': 'Solar Enerji Depolama', 'sub_sub': ['LiFePO4', 'Lityum-Iyon', 'AGM', 'Jel', 'Batarya Modülü', 'BMS', 'Batarya Kabini']}, 'controllers': {'name': 'Solar Şarj Kontrol Cihazları', 'sub_sub': ['MPPT', 'PWM', 'DC-DC', 'Solar Regülatör']}, 'mounting': {'name': 'Panel Montaj Sistemleri', 'sub_sub': ['Çatı', 'Arazi', 'Balkon', 'Cephe', 'Carport', 'Konstrüksiyon', 'Ray', 'Kelepçe', 'Kanca']}, 'cabling': {'name': 'Solar Kablo & Bağlantı', 'sub_sub': ['Solar Kablo', 'MC4', 'Konnektör', 'DC Sigorta', 'DC Şalter', 'Parafudr', 'Kablo Pabuçları', 'Dağıtım Kutusu']}, 'monitoring': {'name': 'Solar İzleme & Haberleşme', 'sub_sub': ['Wi-Fi Gateway', 'Ethernet Gateway', 'GSM Gateway', 'Enerji Metre', 'Akıllı Sayaç', 'Data Logger', 'Bulut İzleme']}, 'maintenance': {'name': 'Solar Bakım & Temizlik', 'sub_sub': ['Panel Temizleme', 'Fırça', 'Temizlik Sistemi', 'Termal Kontrol', 'Test Cihazları']}, 'spare_parts': {'name': 'Solar Yedek Parçaları', 'sub_sub': ['İnverter Fanı', 'Sigorta', 'Röle', 'Kontrol Kartı', 'Konnektör', 'Sensör', 'Kablo', 'Soğutma Parçası']}}}, 'wind': {'name': 'Rüzgâr Enerjisi', 'subcategories': {'turbines': {'name': 'Rüzgâr Türbinleri', 'sub_sub': ['Yatay Eksenli', 'Dikey Eksenli', 'Ev Tipi', 'Çiftlik Tipi', 'Off-Grid', 'Şebeke Bağlantılı']}, 'generators': {'name': 'Rüzgâr Jeneratörleri', 'sub_sub': ['Permanent Magnet', 'Alternatör', 'Jeneratör Başlığı', 'Düşük Devir Jeneratör']}, 'blades': {'name': 'Türbin Kanatları', 'sub_sub': ['Kompozit Kanat', 'Yedek Kanat', 'Kanat Bağlantısı', 'Burun Konisi']}, 'tower': {'name': 'Kule & Direk Sistemleri', 'sub_sub': ['Direk', 'Kafes Kule', 'Gergili Kule', 'Flanş', 'Halat', 'Ankraj']}, 'controllers': {'name': 'Rüzgâr Kontrol Sistemleri', 'sub_sub': ['Şarj Kontrol', 'Dump Load', 'Fren Kontrol', 'Türbin Kontrolörü']}, 'inverters': {'name': 'Rüzgâr İnverterleri', 'sub_sub': ['Off-Grid', 'On-Grid', 'Hybrid', 'Grid-Tie']}, 'mechanical': {'name': 'Mekanik Sistemler', 'sub_sub': ['Rulman', 'Mil', 'Fren', 'Dişli', 'Kaplin', 'Yaw Sistemi', 'Pitch Sistemi']}, 'electrical': {'name': 'Elektrik & Elektronik', 'sub_sub': ['Kablo', 'Konnektör', 'Sigorta', 'Sensör', 'Kontrol Kartı', 'Redresör']}, 'monitoring': {'name': 'Rüzgâr İzleme', 'sub_sub': ['Anemometre', 'Rüzgâr Yön Sensörü', 'Data Logger', 'Gateway', 'Enerji Metre']}, 'spare_parts': {'name': 'Rüzgâr Türbini Yedek Parçaları', 'sub_sub': ['Kanat', 'Rulman', 'Fren', 'Jeneratör Parçası', 'Sensör', 'Kontrol Kartı', 'Kablo', 'Kaplin']}}}, 'energy_storage': {'name': 'Enerji Depolama', 'subcategories': {'home': {'name': 'Ev Tipi Depolama', 'sub_sub': ['5 kWh Sınıfı', '10 kWh Sınıfı', '15 kWh+', 'Duvar Tipi', 'Zemin Tipi']}, 'commercial': {'name': 'Ticari Depolama', 'sub_sub': ['Rack Sistem', 'Kabinet', 'Modüler Sistem', 'Peak Shaving']}, 'industrial': {'name': 'Endüstriyel Depolama', 'sub_sub': ['Container BESS', 'Yüksek Kapasiteli Sistem', 'PCS', 'EMS']}, 'batteries': {'name': 'Bataryalar', 'sub_sub': ['LiFePO4', 'Lityum-Iyon', 'AGM', 'Jel', 'Batarya Modülü']}, 'bms': {'name': 'Batarya Yönetimi', 'sub_sub': ['BMS', 'Balanslama', 'Hücre İzleme', 'Sıcaklık İzleme']}, 'ems': {'name': 'Enerji Yönetim Sistemleri', 'sub_sub': ['EMS', 'Load Management', 'Peak Shaving', 'Self-Consumption', 'Remote Monitoring']}}}, 'hybrid': {'name': 'Hibrit Enerji Sistemleri', 'subcategories': {'solar_wind': {'name': 'Güneş + Rüzgâr', 'sub_sub': ['Hybrid Controller', 'Hybrid Inverter', 'Kombine Sistem', 'Enerji Yönetimi']}, 'solar_storage': {'name': 'Güneş + Batarya', 'sub_sub': ['Hybrid Inverter', 'Battery Storage', 'Backup', 'Self-Consumption']}, 'wind_storage': {'name': 'Rüzgâr + Batarya', 'sub_sub': ['Wind Controller', 'Battery Storage', 'Dump Load', 'Backup']}, 'complete_offgrid': {'name': 'Komple Off-Grid', 'sub_sub': ['Ev', 'Çiftlik', 'Sera', 'Bağ-Bahçe', 'Karavan', 'Tekne', 'Şantiye', 'Acil Durum']}, 'microgrid': {'name': 'Mikro Şebeke', 'sub_sub': ['EMS', 'PCS', 'Load Management', 'Grid Interface']}}}, 'home_building': {'name': 'Ev & Bina Enerji Sistemleri', 'subcategories': {'balcony': {'name': 'Balkon Güneş Sistemleri', 'sub_sub': ['Plug-in Solar', 'Mikro İnverter', 'Montaj', 'Monitoring']}, 'rooftop': {'name': 'Çatı Sistemleri', 'sub_sub': ['Konstrüksiyon', 'Panel', 'İnverter', 'Kablo', 'Koruma']}, 'ev_charging': {'name': 'Enerji & Elektrikli Araç Entegrasyonu', 'sub_sub': ['EV Şarj', 'Solar Şarj', 'Load Balancing', 'Wallbox']}, 'heat_pump': {'name': 'Enerji & Isı Pompası Entegrasyonu', 'sub_sub': ['Enerji Yönetimi', 'Akıllı Sayaç', 'Load Management']}, 'smart_energy': {'name': 'Akıllı Enerji Yönetimi', 'sub_sub': ['Enerji Ölçümü', 'Akıllı Röle', 'Gateway', 'Otomasyon']}}}, 'agriculture_energy': {'name': 'Tarım & Çiftlik Enerjisi', 'subcategories': {'irrigation': {'name': 'Solar Sulama', 'sub_sub': ['Solar Pompa', 'Pompa İnverteri', 'Kontrol', 'Su Depolama']}, 'greenhouse': {'name': 'Sera Enerjisi', 'sub_sub': ['Solar', 'Depolama', 'Havalandırma', 'İklim Kontrol']}, 'livestock': {'name': 'Hayvancılık Enerjisi', 'sub_sub': ['Ahır Solar', 'Sağım Enerjisi', 'Yemleme Enerjisi', 'Sulama Enerjisi', 'Depolama']}, 'farm': {'name': 'Çiftlik Off-Grid', 'sub_sub': ['Ev', 'Atölye', 'Depo', 'Sulama', 'Çit Sistemi', 'Aydınlatma']}, 'fencing': {'name': 'Elektrikli Çit Enerjisi', 'sub_sub': ['Solar Çit Enerjisi', 'Akü', 'Çit Cihazı', 'Topraklama']}}}, 'electrical_protection': {'name': 'Elektrik, Koruma & Montaj', 'subcategories': {'dc': {'name': 'DC Koruma', 'sub_sub': ['DC Sigorta', 'DC Şalter', 'DC Parafudr', 'DC Ayırıcı']}, 'ac': {'name': 'AC Koruma', 'sub_sub': ['AC Sigorta', 'AC Şalter', 'AC Parafudr', 'Kaçak Akım']}, 'grounding': {'name': 'Topraklama', 'sub_sub': ['Topraklama Çubuğu', 'Kablo', 'Klemens', 'Parafudr']}, 'cables': {'name': 'Kablolar', 'sub_sub': ['Solar DC', 'AC', 'Akü Kablosu', 'Topraklama']}, 'mounting': {'name': 'Montaj & Bağlantı', 'sub_sub': ['Kablo Kanalı', 'Ray', 'Kelepçe', 'Konnektör', 'Bağlantı Elemanı']}}}, 'maintenance_spares': {'name': 'Bakım, Servis & Yedek Parçalar', 'subcategories': {'solar_service': {'name': 'Solar Servis', 'sub_sub': ['İnverter Servisi', 'Panel Testi', 'Termal Test', 'Kablo Testi']}, 'wind_service': {'name': 'Rüzgâr Servisi', 'sub_sub': ['Türbin Bakımı', 'Kanat Kontrolü', 'Rulman', 'Fren', 'Jeneratör']}, 'electronics': {'name': 'Elektronik Yedek Parçalar', 'sub_sub': ['PCB', 'Röle', 'Sensör', 'Fan', 'Kontrol Kartı']}, 'mechanical': {'name': 'Mekanik Yedek Parçalar', 'sub_sub': ['Rulman', 'Mil', 'Dişli', 'Kaplin', 'Cıvata', 'Conta']}, 'test': {'name': 'Ölçüm & Test', 'sub_sub': ['Multimetre', 'Pensampermetre', 'İzolasyon Testi', 'IV Curve', 'Termal Kamera']}}}, 'commercial_industrial': {'name': 'Ticari & Endüstriyel Yenilenebilir Enerji', 'subcategories': {'rooftop_candi': {'name': 'Ticari Çatı', 'sub_sub': ['Panel', 'İnverter', 'Konstrüksiyon', 'Depolama', 'EMS']}, 'ground_mount': {'name': 'Arazi GES', 'sub_sub': ['Konstrüksiyon', 'Panel', 'İnverter', 'Trafo', 'Kablo']}, 'wind_farm': {'name': 'Rüzgâr Santrali Ekipmanları', 'sub_sub': ['Türbin Parçaları', 'Elektrik', 'Kablo', 'Kontrol', 'Bakım']}, 'bess': {'name': 'BESS', 'sub_sub': ['Battery Rack', 'PCS', 'EMS', 'HVAC', 'Yangın Güvenliği', 'Kabinet']}, 'monitoring': {'name': 'SCADA & İzleme', 'sub_sub': ['SCADA', 'Gateway', 'Data Logger', 'Enerji Analizi']}}}}

@dataclass
class Product:
    product_id: str
    name: str
    category_id: str
    attributes: Dict[str, Any] = field(default_factory=dict)
    compatible_systems: List[str] = field(default_factory=list)
    source: Optional[str] = None

@dataclass
class EnergySystem:
    system_id: str
    system_type: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    voltage: Optional[str] = None
    power_kw: Optional[float] = None
    capacity_kwh: Optional[float] = None

class RenewableEnergyCatalog:
    def __init__(self, taxonomy=TAXONOMY):
        self.taxonomy = taxonomy

    def subcategories(self, main_key: str) -> Dict[str, Any]:
        return self.taxonomy.get(main_key, {}).get("subcategories", {})

    def sub_subcategories(self, main_key: str, sub_key: str) -> List[str]:
        return self.subcategories(main_key).get(sub_key, {}).get("sub_sub", [])

    def search(self, term: str):
        q = term.casefold()
        hits = []
        for mk, main in self.taxonomy.items():
            if q in main["name"].casefold():
                hits.append((mk, main["name"]))
            for sk, sub in main["subcategories"].items():
                if q in sub["name"].casefold():
                    hits.append((f"{mk}/{sk}", sub["name"]))
                for leaf in sub["sub_sub"]:
                    if q in leaf.casefold():
                        hits.append((f"{mk}/{sk}/{leaf}", leaf))
        return hits

class CompatibilityEngine:
    def __init__(self, systems=None, products=None):
        self.systems = systems or []
        self.products = products or []

    def match(self, system: EnergySystem, product: Product) -> Dict[str, Any]:
        # Conservative compatibility: only claim a match where explicit,
        # source-backed attributes exist. Missing data is "unknown", not "compatible".
        attrs = product.attributes
        checks = []
        for key in ("voltage", "power_kw", "capacity_kwh"):
            if key in attrs and getattr(system, key) is not None:
                checks.append(attrs[key] == getattr(system, key))
        if not checks:
            return {"status": "unknown", "confidence": 0.0}
        confidence = sum(checks) / len(checks)
        return {"status": "compatible" if confidence == 1 else "review", "confidence": confidence}

class MarketIntelligence:
    def score(self, demand, margin, competition_gap, supply_stability, seasonality, risk):
        score = (demand*0.25 + margin*0.25 + competition_gap*0.20 +
                 supply_stability*0.15 + seasonality*0.15 - risk*0.10)
        return max(0.0, min(100.0, score))

    def priority(self, score):
        return "high" if score >= 80 else "medium" if score >= 60 else "watch"

class CategoryGapDetector:
    def compare(self, ours, observed_public_categories):
        ours_set = {str(x).casefold() for x in ours}
        return [x for x in observed_public_categories if str(x).casefold() not in ours_set]

class SupplierConnector:
    def fetch(self, query):
        # Provider-neutral contract. Real credentials/API endpoints are injected
        # by the production environment, never hardcoded in taxonomy code.
        raise NotImplementedError("Configure a production supplier connector.")

class RenewableEnergyIntelligence:
    def analyze(self, product, market):
        return {
            "product": product,
            "market": market,
            "requires_human_review": False
        }



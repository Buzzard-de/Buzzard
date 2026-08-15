from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List

CONSTRUCTION_TAXONOMY = {'construction_materials': {'name': 'İnşaat Malzemeleri', 'sub_sub': ['Çimento', 'Harç & Beton Katkıları', 'Tuğla & Blok', 'Kiremit', 'Yalıtım', 'Su Yalıtımı', 'Alçı & Alçıpan', 'Boya & Kaplama', 'Ahşap Yapı Ürünleri', 'Çelik & Metal', 'Yapıştırıcı & Mastik', 'Sızdırmazlık', 'Drenaj', 'Bağlantı Elemanları']}, 'earthmoving': {'name': 'Hafriyat & Toprak İşleme Makineleri', 'sub_sub': ['Ekskavatör', 'Mini Ekskavatör', 'Paletli Yükleyici', 'Lastikli Yükleyici', 'Kazıcı-Yükleyici', 'Dozer', 'Greyder', 'Skid Steer', 'Kompakt Yükleyici']}, 'concrete': {'name': 'Beton & Harç Makineleri', 'sub_sub': ['Beton Mikseri', 'Transmikser Ekipmanı', 'Beton Pompası', 'Harç Makinesi', 'Şap Makinesi', 'Beton Vibratörü', 'Beton Kesme', 'Beton Taşlama']}, 'road': {'name': 'Yol Yapım Makineleri', 'sub_sub': ['Asfalt Finişeri', 'Asfalt Silindiri', 'Toprak Silindiri', 'Tandem Silindir', 'Kompaktör', 'Freze', 'Bitüm Ekipmanları', 'Yol Süpürme']}, 'lifting': {'name': 'Vinç & Kaldırma Ekipmanları', 'sub_sub': ['Mobil Vinç', 'Paletli Vinç', 'Kule Vinç', 'Teleskopik Yükleyici', 'Forklift', 'Manlift', 'Platform', 'Ceraskal', 'Vinç Aksesuarları']}, 'drilling_breaking': {'name': 'Delme, Kırma & Kazı Ekipmanları', 'sub_sub': ['Hidrolik Kırıcı', 'Kaya Kırıcı', 'Delici', 'Kaya Matkabı', 'Sondaj', 'Kırıcı Uç', 'Kesici Disk', 'Karot Makinesi']}, 'compaction': {'name': 'Sıkıştırma Makineleri', 'sub_sub': ['Titreşimli Plaka', 'Tokmak', 'Silindir', 'Kompaktör', 'Tambur', 'Vibrasyon Sistemi']}, 'power_tools': {'name': 'Elektrikli & Akülü İnşaat Aletleri', 'sub_sub': ['Darbeli Matkap', 'Kırıcı-Delici', 'Taşlama', 'Kesme Makinesi', 'Karıştırıcı', 'Testere', 'Çivi Tabancası', 'Zımpara', 'Akü & Şarj']}, 'hand_tools': {'name': 'İnşaat El Aletleri', 'sub_sub': ['Çekiç', 'Keski', 'Mala', 'Spatula', 'Su Terazisi', 'Metre', 'Kesici', 'Pense', 'Anahtar', 'Kova', 'El Arabası']}, 'generators_compressors': {'name': 'Jeneratör & Kompresörler', 'sub_sub': ['Dizel Jeneratör', 'Benzinli Jeneratör', 'İnverter Jeneratör', 'Hava Kompresörü', 'Vidalı Kompresör', 'Pistonlu Kompresör', 'Kompresör Parçaları']}, 'scaffolding_formwork': {'name': 'İskele & Kalıp Sistemleri', 'sub_sub': ['Cephe İskelesi', 'Mobil İskele', 'Kalıp', 'Panel Kalıp', 'Beton Kalıbı', 'İskele Tekerleği', 'Kriko', 'Destek Sistemi']}, 'site_equipment': {'name': 'Şantiye Ekipmanları', 'sub_sub': ['Şantiye Aydınlatması', 'Su Pompası', 'Drenaj Pompası', 'Isıtıcı', 'Fan', 'Kablo Makarası', 'Şantiye Kablosu', 'Dağıtım Panosu', 'Su Tankı']}, 'safety': {'name': 'İş Güvenliği & Kişisel Koruyucu Ekipman', 'sub_sub': ['Baret', 'İş Ayakkabısı', 'Eldiven', 'Gözlük', 'Kulak Koruyucu', 'Maske', 'Emniyet Kemeri', 'Düşüş Durdurma', 'Reflektif Giyim', 'İlk Yardım']}, 'machine_parts': {'name': 'İnşaat Makineleri Yedek Parçaları', 'sub_sub': ['Motor Parçaları', 'Yakıt Sistemi', 'Turbo', 'Soğutma', 'Şanzıman', 'Diferansiyel', 'Aks', 'Hidrolik Pompa', 'Hidrolik Valf', 'Hidrolik Silindir', 'Hortum', 'Rulman', 'Keçe', 'Conta', 'Filtre', 'Kayış', 'Zincir', 'Elektrik', 'Sensör', 'ECU', 'Marş', 'Alternatör']}, 'undercarriage': {'name': 'Palet, Lastik & Yürüyüş Sistemleri', 'sub_sub': ['Palet Zinciri', 'Palet Pabucu', 'Palet Rulosu', 'İdler', 'Tahrik Dişlisi', 'Yürüyüş Motoru', 'Lastik', 'Dolgu Lastik', 'Jant', 'Yürüyüş Aksamı']}, 'attachments': {'name': 'Ataşmanlar', 'sub_sub': ['Kepçe', 'Hendek Kepçesi', 'Kaya Kepçesi', 'Hidrolik Kıskaç', 'Çatal', 'Riper', 'Blade', 'Auger', 'Süpürge', 'Kırıcı', 'Hızlı Bağlantı']}, 'hydraulic': {'name': 'Hidrolik Sistemler & Parçaları', 'sub_sub': ['Hidrolik Pompa', 'Ana Pompa', 'Valf', 'Distribütör', 'Silindir', 'Hortum', 'Rakor', 'Quick Coupling', 'Filtre', 'Tank', 'Hidrolik Motor', 'Keçe Seti']}, 'electrical': {'name': 'Elektrik & Elektronik', 'sub_sub': ['Akü', 'Alternatör', 'Marş Motoru', 'Kablo', 'Sigorta', 'Röle', 'Sensör', 'Joystick', 'Kontrol Ünitesi', 'ECU', 'Ekran', 'Aydınlatma', 'Kamera']}, 'maintenance': {'name': 'Bakım, Sarf & Servis', 'sub_sub': ['Motor Yağı', 'Hidrolik Yağ', 'Şanzıman Yağı', 'Gres', 'Antifriz', 'Filtreler', 'Kayışlar', 'Rulmanlar', 'Keçeler', 'Temizlik', 'Servis Kitleri', 'Cıvata & Somun']}, 'survey_measurement': {'name': 'Ölçüm, Lazer & Şantiye Teknolojileri', 'sub_sub': ['Lazer Metre', 'Çizgi Lazer', 'Rotasyon Lazer', 'Nivo', 'Total Station', 'Dedektör', 'GPS/GNSS', 'Mesafe Ölçer', 'Nem Ölçer']}, 'site_services': {'name': 'Şantiye Geçici Sistemleri', 'sub_sub': ['Geçici Elektrik', 'Geçici Su', 'Mobil Aydınlatma', 'Mobil Isıtma', 'Mobil Soğutma', 'Çit', 'Bariyer', 'Trafik Güvenliği']}, 'recycling': {'name': 'Yıkım, Geri Dönüşüm & Atık', 'sub_sub': ['Yıkım Makineleri', 'Beton Kırıcı', 'Metal Ayırma', 'Konveyör', 'Elek', 'Mıknatıs', 'Atık Konteyneri']}}

@dataclass
class ConstructionMachine:
    machine_id: str
    machine_type: str
    make: Optional[str]=None
    model: Optional[str]=None
    year_from: Optional[int]=None
    year_to: Optional[int]=None
    engine: Optional[str]=None
    engine_code: Optional[str]=None
    power_kw: Optional[float]=None

@dataclass
class ConstructionPart:
    product_id: str
    name: str
    category_path: str
    attributes: Dict[str, Any]=field(default_factory=dict)
    source: Optional[str]=None

@dataclass
class FitmentResult:
    status: str
    confidence: float
    reasons: List[str]=field(default_factory=list)

class ConstructionCatalog:
    def __init__(self, taxonomy=CONSTRUCTION_TAXONOMY):
        self.taxonomy=taxonomy

    def categories(self):
        return self.taxonomy

    def sub_subcategories(self, key):
        return self.taxonomy.get(key,{}).get("sub_sub",[])

    def search(self, term):
        q=term.casefold()
        out=[]
        for k,v in self.taxonomy.items():
            if q in v["name"].casefold():
                out.append((k,v["name"]))
            for x in v["sub_sub"]:
                if q in x.casefold():
                    out.append((f"{k}/{x}",x))
        return out

class ConstructionFitmentEngine:
    """
    Conservative machine/part compatibility:
    missing evidence => unknown; conflicting evidence => review.
    """
    def match(self, machine: ConstructionMachine, part: ConstructionPart):
        a=part.attributes
        checks=[]
        reasons=[]
        for key in ("machine_type","make","model","engine_code"):
            if key in a and getattr(machine,key,None):
                ok=str(a[key]).casefold()==str(getattr(machine,key)).casefold()
                checks.append(ok)
                reasons.append(f"{key}={'match' if ok else 'mismatch'}")
        if not checks:
            return FitmentResult("unknown",0.0,["yeterli uyumluluk kanıtı yok"])
        conf=sum(checks)/len(checks)
        if all(checks):
            return FitmentResult("compatible",conf,reasons)
        return FitmentResult("review",conf,reasons)

class ConstructionMarketIntelligence:
    def score(self,demand,margin,competition_gap,supply_stability,seasonality,risk):
        s=(demand*.25+margin*.25+competition_gap*.20+supply_stability*.15+seasonality*.15-risk*.10)
        return max(0,min(100,s))
    def priority(self,score):
        return "high" if score>=80 else "medium" if score>=60 else "watch"

class ConstructionGapDetector:
    def compare(self, ours, observed_public_categories):
        o={str(x).casefold() for x in ours}
        return [x for x in observed_public_categories if str(x).casefold() not in o]

class SupplierConnector:
    def fetch(self, query):
        raise NotImplementedError("Production supplier connector must be configured securely.")

class ConstructionIntelligence:
    def product_opportunity(self, product, market_signal):
        return {"product":product,"market_signal":market_signal,"requires_human_review":False}

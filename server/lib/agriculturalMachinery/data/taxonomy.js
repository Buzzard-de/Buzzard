/** Internal agricultural taxonomy. Does not replace data/buzzard_categories.json. */

function n(id, parentId, slug, names, synonyms, attributes, shopCategoryId = "cat-20") {
  return { id, parentId, slug, names, synonyms, attributes, shopCategoryId };
}

const deen = (de, en, tr, fr) => ({ de, en, tr, fr });

const categories = [
  n("ame-cat-tractors", null, "tractors", deen("Traktoren", "Tractors", "Traktörler", "Tracteurs"), ["Schlepper", "traktor"], ["ptoSpeed", "hitchCategory"]),
  n("ame-cat-tractors-standard", "ame-cat-tractors", "standard-tractors", deen("Standardtraktoren", "Standard agricultural tractors", "Standart traktörler", "Tracteurs standards"), ["Ackerschlepper"], ["ptoSpeed"]),
  n("ame-cat-tractors-compact", "ame-cat-tractors", "compact-tractors", deen("Kompakttraktoren", "Compact tractors", "Kompakt traktörler", "Tracteurs compacts"), ["Kompaktschlepper"], ["ptoSpeed"]),
  n("ame-cat-tractors-utility", "ame-cat-tractors", "utility-tractors", deen("Allzwecktraktoren", "Utility tractors", "Çok amaçlı traktörler", "Tracteurs utilitaires"), ["Utility"], ["ptoSpeed"]),
  n("ame-cat-tractors-orchard", "ame-cat-tractors", "orchard-tractors", deen("Obsbautraktoren", "Orchard tractors", "Bahçe traktörleri", "Tracteurs vergers"), ["Obstanbau"], ["widthMm"]),
  n("ame-cat-tractors-vineyard", "ame-cat-tractors", "vineyard-tractors", deen("Weinbergtraktoren", "Vineyard tractors", "Bağ traktörleri", "Tracteurs vignes"), ["Weinberg"], ["widthMm"]),
  n("ame-cat-tractors-articulated", "ame-cat-tractors", "articulated-tractors", deen("Knicklenkertraktoren", "Articulated tractors", "Mafsallı traktörler", "Tracteurs articulés"), ["Knicklenker"], ["articulation"]),
  n("ame-cat-tractors-track", "ame-cat-tractors", "track-tractors", deen("Raupentraktoren", "Track tractors", "Paletli traktörler", "Tracteurs chenillés"), ["Raupenschlepper"], ["trackType"]),
  n("ame-cat-tractors-electric", "ame-cat-tractors", "electric-tractors", deen("Elektrische Traktoren", "Electric agricultural tractors", "Elektrikli traktörler", "Tracteurs électriques"), ["E-Traktor"], ["voltage"]),

  n("ame-cat-soil", null, "soil-preparation", deen("Bodenbearbeitung", "Soil preparation", "Toprak işleme", "Préparation du sol"), ["Boden"], ["workingWidthMm"]),
  n("ame-cat-ploughs", "ame-cat-soil", "ploughs", deen("Pflüge", "Ploughs", "Pulluklar", "Charrues"), ["Pflug"], ["furrowCount"]),
  n("ame-cat-reversible-ploughs", "ame-cat-soil", "reversible-ploughs", deen("Drehpflüge", "Reversible ploughs", "Çevrilir pulluklar", "Charrues réversibles"), ["Volldrehpflug"], ["furrowCount"]),
  n("ame-cat-cultivators", "ame-cat-soil", "cultivators", deen("Grubber", "Cultivators", "Kültivatörler", "Cultivateurs"), ["Kultivator"], ["tineCount"]),
  n("ame-cat-disc-harrows", "ame-cat-soil", "disc-harrows", deen("Scheibeneggen", "Disc harrows", "Diskaro", "Herses à disques"), ["Scheibenegge"], ["discCount"]),
  n("ame-cat-power-harrows", "ame-cat-soil", "power-harrows", deen("Kreiseleggen", "Power harrows", "Döner tırmıklar", "Herses rotatives"), ["Kreiselegge"], ["ptoSpeed"]),
  n("ame-cat-subsoilers", "ame-cat-soil", "subsoilers", deen("Tiefelockerer", "Subsoilers", "Dipkazanlar", "Sous-soleuses"), ["Tiefgrubber"], ["workingDepthMm"]),
  n("ame-cat-rotavators", "ame-cat-soil", "rotavators", deen("Bodenfräsen", "Rotavators", "Rotovatörler", "Rotavators"), ["Fräse"], ["ptoSpeed"]),
  n("ame-cat-seedbed", "ame-cat-soil", "seedbed", deen("Saatbettkombinationen", "Seedbed preparation equipment", "Tohum yatağı", "Lit de semence"), ["Saatbett"], ["workingWidthMm"]),
  n("ame-cat-levelling", "ame-cat-soil", "land-levelling", deen("Planiergeräte", "Land levelling equipment", "Tesviye", "Nivellement"), ["Planierschild"], ["bladeWidthMm"]),

  n("ame-cat-seeding", null, "seeding-planting", deen("Säen und Pflanzen", "Seeding and planting", "Ekim ve dikim", "Semis et plantation"), ["Sätechnik"], ["rowCount"]),
  n("ame-cat-seed-drills", "ame-cat-seeding", "seed-drills", deen("Sämaschinen", "Seed drills", "Mibzerler", "Semoirs"), ["Drillmaschine"], ["rowSpacingMm"]),
  n("ame-cat-precision-planters", "ame-cat-seeding", "precision-planters", deen("Einzelkornsämaschinen", "Precision planters", "Hassas ekim", "Semoirs de précision"), ["Einzelkorn"], ["rowCount"]),
  n("ame-cat-pneumatic-planters", "ame-cat-seeding", "pneumatic-planters", deen("Pneumatische Sämaschinen", "Pneumatic planters", "Pnömatik ekim", "Semoirs pneumatiques"), ["Luftsaat"], ["fanType"]),
  n("ame-cat-mechanical-planters", "ame-cat-seeding", "mechanical-planters", deen("Mechanische Sämaschinen", "Mechanical planters", "Mekanik ekim", "Semoirs mécaniques"), ["Mechanisch"], ["rowCount"]),
  n("ame-cat-potato-planters", "ame-cat-seeding", "potato-planters", deen("Kartoffellegemaschinen", "Potato planters", "Patates dikiciler", "Planteuses de pommes de terre"), ["Kartoffelleger"], ["rowCount"]),
  n("ame-cat-transplanters", "ame-cat-seeding", "transplanters", deen("Pflanzmaschinen", "Transplanters", "Fide dikiciler", "Transplanteuses"), ["Setzling"], ["rowCount"]),
  n("ame-cat-fertilizer-placement", "ame-cat-seeding", "fertilizer-placement", deen("Düngerablage", "Fertilizer placement equipment", "Gübre yerleştirme", "Localisation d'engrais"), ["Unterfußdüngung"], ["hopperVolumeL"]),

  n("ame-cat-harvesting", null, "harvesting", deen("Erntetechnik", "Harvesting", "Hasat", "Récolte"), ["Ernte"], ["headerType"]),
  n("ame-cat-combines", "ame-cat-harvesting", "combine-harvesters", deen("Mähdrescher", "Combine harvesters", "Biçerdöverler", "Moissonneuses-batteuses"), ["Combine"], ["grainTankL"]),
  n("ame-cat-forage-harvesters", "ame-cat-harvesting", "forage-harvesters", deen("Feldhäcksler", "Forage harvesters", "Silaj makinaları", "Ensileuses"), ["Häcksler"], ["chopLengthMm"]),
  n("ame-cat-potato-harvesters", "ame-cat-harvesting", "potato-harvesters", deen("Kartoffelroder", "Potato harvesters", "Patates hasat", "Arracheuses de pommes de terre"), ["Roder"], ["webWidthMm"]),
  n("ame-cat-beet-harvesters", "ame-cat-harvesting", "beet-harvesters", deen("Rübenroder", "Beet harvesters", "Pancar hasat", "Arracheuses de betteraves"), ["Rüben"], ["rowCount"]),
  n("ame-cat-vegetable-harvesters", "ame-cat-harvesting", "vegetable-harvesters", deen("Gemüseernter", "Vegetable harvesters", "Sebze hasat", "Récolteuses de légumes"), ["Gemüse"], ["cropType"]),
  n("ame-cat-corn-headers", "ame-cat-harvesting", "corn-headers", deen("Maisvorsätze", "Corn headers", "Mısır tablaları", "Becs à maïs"), ["Maisgebiss"], ["rowCount"]),
  n("ame-cat-grain-headers", "ame-cat-harvesting", "grain-headers", deen("Schneidwerke", "Grain headers", "Tahıl tablaları", "Barres de coupe"), ["Schneidwerk"], ["widthM"]),
  n("ame-cat-harvest-attachments", "ame-cat-harvesting", "harvesting-attachments", deen("Erntevorsätze", "Harvesting attachments", "Hasat ataşmanları", "Accessoires de récolte"), ["Vorsatz"], ["attachmentType"]),

  n("ame-cat-hay", null, "hay-forage", deen("Futterernte", "Hay and forage", "Ot ve yem", "Foin et fourrage"), ["Grünland"], ["workingWidthM"]),
  n("ame-cat-mowers", "ame-cat-hay", "mowers", deen("Mähwerke", "Mowers", "Biçme makineleri", "Faucheuses"), ["Mäher"], ["ptoSpeed"]),
  n("ame-cat-disc-mowers", "ame-cat-hay", "disc-mowers", deen("Scheibenmähwerke", "Disc mowers", "Diskli biçme", "Faucheuses à disques"), ["Scheibenmähwerk"], ["discCount"]),
  n("ame-cat-drum-mowers", "ame-cat-hay", "drum-mowers", deen("Trommelmähwerke", "Drum mowers", "Tamburlu biçme", "Faucheuses à tambours"), ["Trommelmähwerk"], ["drumCount"]),
  n("ame-cat-tedders", "ame-cat-hay", "tedders", deen("Kreiselzettwender", "Tedders", "Ot sericiler", "Faneuses"), ["Zettwender"], ["rotorCount"]),
  n("ame-cat-rakes", "ame-cat-hay", "rakes", deen("Schwader", "Rakes", "Tırmıklar", "Andaineuses"), ["Schwader"], ["rotorCount"]),
  n("ame-cat-rotary-rakes", "ame-cat-hay", "rotary-rakes", deen("Kreiselschwader", "Rotary rakes", "Döner tırmık", "Andaineuses rotatives"), ["Kreiselschwader"], ["rotorCount"]),
  n("ame-cat-balers", "ame-cat-hay", "balers", deen("Ballenpressen", "Balers", "Balya makineleri", "Presses"), ["Presse"], ["baleType"]),
  n("ame-cat-round-balers", "ame-cat-hay", "round-balers", deen("Rundballenpressen", "Round balers", "Yuvarlak balya", "Presses à balles rondes"), ["Rundballen"], ["chamberType"]),
  n("ame-cat-square-balers", "ame-cat-hay", "square-balers", deen("Quaderballenpressen", "Square balers", "Köşeli balya", "Presses à balles cubiques"), ["Quaderballen"], ["baleSize"]),
  n("ame-cat-bale-wrappers", "ame-cat-hay", "bale-wrappers", deen("Wickelgeräte", "Bale wrappers", "Balya sarıcılar", "Enrubanneuses"), ["Wickler"], ["filmWidthMm"]),
  n("ame-cat-forage-wagons", "ame-cat-hay", "forage-wagons", deen("Ladewagen", "Forage wagons", "Yem vagonları", "Remorques autochargeuses"), ["Ladewagen"], ["volumeM3"]),

  n("ame-cat-crop-protection", null, "fertilization-crop-protection", deen("Düngung und Pflanzenschutz", "Fertilization and crop protection", "Gübreleme ve koruma", "Fertilisation et protection"), ["Pflanzenschutz"], ["tankVolumeL"]),
  n("ame-cat-fertilizer-spreaders", "ame-cat-crop-protection", "fertilizer-spreaders", deen("Düngerstreuer", "Fertilizer spreaders", "Gübre serpiciler", "Épandeurs d'engrais"), ["Streuer"], ["workingWidthM"]),
  n("ame-cat-manure-spreaders", "ame-cat-crop-protection", "manure-spreaders", deen("Stalldungstreuer", "Manure spreaders", "Ahır gübresi serpiciler", "Épandeurs de fumier"), ["Miststreuer"], ["capacityM3"]),
  n("ame-cat-slurry", "ame-cat-crop-protection", "slurry-equipment", deen("Gülletechnik", "Slurry equipment", "Sıvı gübre", "Lisier"), ["Güllefass"], ["tankVolumeL"]),
  n("ame-cat-field-sprayers", "ame-cat-crop-protection", "field-sprayers", deen("Feldspritzen", "Field sprayers", "Tarla pülverizatörleri", "Pulvérisateurs"), ["Spritze"], ["boomWidthM"]),
  n("ame-cat-mounted-sprayers", "ame-cat-crop-protection", "mounted-sprayers", deen("Anbauspritzen", "Mounted sprayers", "Asılır pülverizatör", "Pulvérisateurs portés"), ["Anbauspritze"], ["tankVolumeL"]),
  n("ame-cat-trailed-sprayers", "ame-cat-crop-protection", "trailed-sprayers", deen("Anhängefeldspritzen", "Trailed sprayers", "Çekilir pülverizatör", "Pulvérisateurs traînés"), ["Anhängefeldspritze"], ["tankVolumeL"]),
  n("ame-cat-selfpropelled-sprayers", "ame-cat-crop-protection", "self-propelled-sprayers", deen("Selbstfahrspritzen", "Self-propelled sprayers", "Öz tahrikli pülverizatör", "Pulvérisateurs automoteurs"), ["Selbstfahrer"], ["boomWidthM"]),
  n("ame-cat-nozzles", "ame-cat-crop-protection", "nozzles", deen("Düsen und Spritzkomponenten", "Nozzles and spraying components", "Memeler", "Buses"), ["Düse", "nozzle"], ["sprayAngle"]),

  n("ame-cat-irrigation", null, "irrigation", deen("Bewässerung", "Irrigation", "Sulama", "Irrigation"), ["Beregnung"], ["flowLMin"]),
  n("ame-cat-irrigation-pumps", "ame-cat-irrigation", "irrigation-pumps", deen("Bewässerungspumpen", "Irrigation pumps", "Sulama pompaları", "Pompes d'irrigation"), ["Pumpe"], ["flowLMin"]),
  n("ame-cat-irrigation-systems", "ame-cat-irrigation", "irrigation-systems", deen("Bewässerungssysteme", "Irrigation systems", "Sulama sistemleri", "Systèmes d'irrigation"), ["Beregnung"], ["coverageHa"]),
  n("ame-cat-sprinklers", "ame-cat-irrigation", "sprinkler-systems", deen("Regneranlagen", "Sprinkler systems", "Yağmurlama", "Aspersion"), ["Regner"], ["nozzleSize"]),
  n("ame-cat-drip", "ame-cat-irrigation", "drip-irrigation", deen("Tropfbewässerung", "Drip irrigation equipment", "Damla sulama", "Goutte-à-goutte"), ["Tropfer"], ["emitterSpacingMm"]),
  n("ame-cat-irrigation-control", "ame-cat-irrigation", "irrigation-control", deen("Bewässerungssteuerung", "Irrigation control components", "Sulama kontrol", "Commande d'irrigation"), ["Steuerung"], ["voltage"]),

  n("ame-cat-livestock", null, "livestock-feeding", deen("Stall- und Fütterungstechnik", "Livestock and feeding equipment", "Hayvancılık ve yemleme", "Élevage et alimentation"), ["Stalltechnik"], ["capacityM3"], "cat-20-01"),
  n("ame-cat-feed-mixers", "ame-cat-livestock", "feed-mixers", deen("Futtermischwagen", "Feed mixers", "Yem karıştırıcılar", "Mélangeuses"), ["Mischwagen"], ["volumeM3"]),
  n("ame-cat-feed-wagons", "ame-cat-livestock", "feed-wagons", deen("Futterwagen", "Feed wagons", "Yem arabaları", "Wagons d'alimentation"), ["Futterwagen"], ["volumeM3"]),
  n("ame-cat-silage", "ame-cat-livestock", "silage-equipment", deen("Silagetechnik", "Silage equipment", "Silaj ekipmanı", "Ensilage"), ["Silage"], ["cutterType"]),
  n("ame-cat-milking", "ame-cat-livestock", "milking-equipment", deen("Melktechnik", "Milking equipment", "Süt sağım", "Traite"), ["Melkanlage"], ["clusterCount"]),
  n("ame-cat-feeding-systems", "ame-cat-livestock", "feeding-systems", deen("Fütterungsanlagen", "Feeding systems", "Yemleme sistemleri", "Systèmes d'alimentation"), ["Fütterung"], ["automation"]),
  n("ame-cat-manure-handling", "ame-cat-livestock", "manure-handling", deen("Entmistung", "Manure handling equipment", "Gübre elleçleme", "Fumier"), ["Entmistung"], ["scraperType"]),

  n("ame-cat-transport", null, "transport-pto", deen("Transport und Zapfwelle", "Transport and PTO equipment", "Taşıma ve PTO", "Transport et PDF"), ["Zapfwelle", "PTO"], ["ptoSpeed"]),
  n("ame-cat-trailers", "ame-cat-transport", "agricultural-trailers", deen("Landwirtschaftliche Anhänger", "Agricultural trailers", "Tarım römorkları", "Remorques agricoles"), ["Anhänger"], ["payloadT"]),
  n("ame-cat-mounted", "ame-cat-transport", "tractor-mounted", deen("Anbaugeräte", "Tractor-mounted equipment", "Traktör asılır", "Outils portés"), ["Anbau"], ["hitchCategory"]),
  n("ame-cat-pto-driven", "ame-cat-transport", "pto-driven", deen("Zapfwellenantriebe", "PTO-driven equipment", "PTO tahrikli", "Outils à PDF"), ["PTO"], ["ptoSpeed"]),
  n("ame-cat-pto-shafts", "ame-cat-transport", "pto-shafts", deen("Gelenkwellen", "PTO shafts", "Kardán milleri", "Cardans"), ["Gelenkwelle", "zapfwelle"], ["lengthMm", "profile"]),
  n("ame-cat-hitch", "ame-cat-transport", "drawbar-hitch", deen("Zug- und Anhängevorrichtungen", "Drawbar and hitch equipment", "Çeki ve bağlantı", "Attelage"), ["Anhängekupplung"], ["hitchCategory"]),
  n("ame-cat-three-point", "ame-cat-transport", "three-point-linkage", deen("Dreipunkt-Anbauteile", "Three-point linkage equipment", "Üç nokta bağlantı", "Trois points"), ["Dreipunkt", "3-punkt"], ["linkageCategory"]),

  n("ame-cat-specialist", null, "specialist", deen("Spezialtechnik", "Specialist equipment", "Özel ekipman", "Équipement spécialisé"), ["Spezial"], ["application"]),
  n("ame-cat-vineyard-machines", "ame-cat-specialist", "vineyard-machinery", deen("Weinbautechnik", "Vineyard machinery", "Bağ makinaları", "Vignoble"), ["Weinbau"], ["rowWidthMm"]),
  n("ame-cat-orchard-machines", "ame-cat-specialist", "orchard-machinery", deen("Obstbautechnik", "Orchard machinery", "Bahçe makinaları", "Vergers"), ["Obstbau"], ["canopyHeightM"]),
  n("ame-cat-forestry-ag", "ame-cat-specialist", "forestry-agricultural", deen("Forst-Landtechnik", "Forestry-agricultural equipment", "Orman-tarım", "Forestier-agricole"), ["Forst"], ["winchKn"]),
  n("ame-cat-ag-loaders", "ame-cat-specialist", "agricultural-loaders", deen("Frontlader", "Agricultural loaders", "Tarım yükleyiciler", "Chargeurs agricoles"), ["Frontlader"], ["liftHeightM"]),
  n("ame-cat-ag-telehandlers", "ame-cat-specialist", "agricultural-telehandlers", deen("Teleskoplader (Landwirtschaft)", "Agricultural telehandlers", "Tarım telehandler", "Télescopiques agricoles"), ["Telehandler"], ["liftHeightM"]),
  n("ame-cat-attachments", "ame-cat-specialist", "attachments", deen("Landmaschinen-Anbauteile", "Agricultural machinery attachments", "Tarım ataşmanları", "Accessoires"), ["Anbauteil"], ["attachmentType"]),
];

module.exports = {
  version: "1.0.0",
  scope: "agricultural-machinery",
  shopCategoryId: "cat-20",
  note: "Internal agricultural taxonomy. Isolated from construction cme-cat-* and shop tree.",
  categories,
};

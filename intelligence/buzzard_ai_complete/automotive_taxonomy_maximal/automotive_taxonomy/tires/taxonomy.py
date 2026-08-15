# Dedicated Tire category: Automotive -> Tires -> subcategory -> sub-subcategory.
TIRE_TAXONOMY = {
 "passenger_car": {
   "name":"Binek Araç Lastikleri",
   "subcategories":{
     "summer":{"name":"Yaz Lastikleri","sub_sub":["Standart","Performans","Premium","Eco"]},
     "winter":{"name":"Kış Lastikleri","sub_sub":["Standart","Performans","Premium","Çivili"]},
     "all_season":{"name":"4 Mevsim Lastikleri","sub_sub":["Standart","Premium","3PMSF"]},
     "performance":{"name":"Performans Lastikleri","sub_sub":["UHP","Sport","Track"]},
     "ev":{"name":"Elektrikli Araç Lastikleri","sub_sub":["EV Optimized","Low Rolling Resistance","Heavy Load"]},
     "runflat":{"name":"Run-Flat Lastikler","sub_sub":["RFT","SSR","ZP"]},
     "reinforced":{"name":"XL / Reinforced Lastikler","sub_sub":["XL","Reinforced","Extra Load"]}
   }
 },
 "suv_4x4": {
   "name":"SUV / 4x4 / Off-Road Lastikleri",
   "subcategories":{
     "highway":{"name":"H/T Highway Terrain","sub_sub":["Standard","Premium"]},
     "all_terrain":{"name":"A/T All Terrain","sub_sub":["Light A/T","A/T","Severe A/T"]},
     "mud_terrain":{"name":"M/T Mud Terrain","sub_sub":["M/T","Extreme M/T"]},
     "winter":{"name":"4x4 Kış Lastikleri","sub_sub":["Winter","3PMSF"]},
     "ev":{"name":"Elektrikli SUV Lastikleri","sub_sub":["EV","XL EV"]}
   }
 },
 "light_commercial": {
   "name":"Hafif Ticari Lastikler",
   "subcategories":{
     "summer":{"name":"Yaz","sub_sub":["C","CP","Van"]},
     "winter":{"name":"Kış","sub_sub":["C","CP","Van"]},
     "all_season":{"name":"4 Mevsim","sub_sub":["C","CP","Van"]},
     "reinforced":{"name":"Heavy Load / Reinforced","sub_sub":["C","CP","XL"]}
   }
 },
 "truck": {
   "name":"Kamyon Lastikleri",
   "subcategories":{
     "steer":{"name":"Direksiyon Aksı Lastikleri","sub_sub":["Long Haul","Regional","Mixed Service"]},
     "drive":{"name":"Çekiş Aksı Lastikleri","sub_sub":["Long Haul","Regional","On/Off"]},
     "trailer":{"name":"Treyler Aksı Lastikleri","sub_sub":["Long Haul","Regional","Heavy Duty"]},
     "mixed":{"name":"Karma Kullanım","sub_sub":["On/Off","Off-Road"]},
     "winter":{"name":"Kış","sub_sub":["Regional","Severe Winter"]}
   }
 },
 "bus": {
   "name":"Otobüs Lastikleri",
   "subcategories":{
     "city":{"name":"Şehir Otobüsü","sub_sub":["Urban","Stop/Go"]},
     "coach":{"name":"Turizm / Şehirlerarası","sub_sub":["Coach","Long Haul"]},
     "regional":{"name":"Bölgesel","sub_sub":["Regional","Mixed"]}
   }
 },
 "trailer": {
   "name":"Römork & Treyler Lastikleri",
   "subcategories":{
     "caravan":{"name":"Karavan Lastikleri","sub_sub":["CP","Heavy Load"]},
     "trailer":{"name":"Treyler Lastikleri","sub_sub":["ST","Regional","Heavy Duty"]},
     "agricultural_trailer":{"name":"Tarım Römorku","sub_sub":["Implement","Trailer"]}
   }
 },
 "motorcycle": {
   "name":"Motosiklet Lastikleri",
   "subcategories":{
     "sport":{"name":"Sport","sub_sub":["Hypersport","Supersport","Track"]},
     "touring":{"name":"Touring","sub_sub":["Sport Touring","Grand Touring"]},
     "cruiser":{"name":"Cruiser","sub_sub":["Cruiser","Custom"]},
     "enduro":{"name":"Enduro / Adventure","sub_sub":["Road","Mixed","Off-Road"]},
     "scooter":{"name":"Scooter","sub_sub":["City","Touring","Performance"]},
     "racing":{"name":"Yarış","sub_sub":["Slick","Rain","Race"]},
     "winter":{"name":"Kış","sub_sub":["Scooter Winter","Cold Weather"]}
   }
 },
 "atv_quad": {
   "name":"ATV / Quad Lastikleri",
   "subcategories":{
     "utility":{"name":"Utility","sub_sub":["Work","Mud","All Terrain"]},
     "sport":{"name":"Sport","sub_sub":["Sport","Race"]},
     "sand":{"name":"Sand","sub_sub":["Front","Rear"]},
     "mud":{"name":"Mud","sub_sub":["Mud","Extreme Mud"]}
   }
 },
 "tractor": {
   "name":"Traktör Lastikleri",
   "subcategories":{
     "front":{"name":"Ön Lastikler","sub_sub":["FWD","2WD","4WD"]},
     "rear":{"name":"Arka Lastikler","sub_sub":["Radial","Bias"]},
     "row_crop":{"name":"Sıra Arası","sub_sub":["Narrow","VF","IF"]},
     "forestry":{"name":"Orman","sub_sub":["Forestry","Reinforced"]}
   }
 },
 "agricultural_machine": {
   "name":"Tarım Makinesi Lastikleri",
   "subcategories":{
     "implement":{"name":"Ekipman Lastikleri","sub_sub":["Implement","Trailer","Flotation"]},
     "harvester":{"name":"Biçerdöver Lastikleri","sub_sub":["Front","Rear","High Flotation"]},
     "sprayer":{"name":"İlaçlama Makinesi Lastikleri","sub_sub":["Row Crop","VF","IF"]}
   }
 },
 "construction_industrial": {
   "name":"İş Makinesi / Endüstriyel Lastikler",
   "subcategories":{
     "loader":{"name":"Loader","sub_sub":["L","E3/L3","L5"]},
     "excavator":{"name":"Ekskavatör","sub_sub":["Industrial","OTR"]},
     "forklift":{"name":"Forklift","sub_sub":["Pneumatic","Solid"]},
     "industrial":{"name":"Endüstriyel","sub_sub":["Solid","Pneumatic","Non-Marking"]}
   }
 },
 "specialty": {
   "name":"Özel Kullanım Lastikleri",
   "subcategories":{
     "racing":{"name":"Yarış","sub_sub":["Slick","Semi-Slick","Rain"]},
     "classic":{"name":"Klasik / Oldtimer","sub_sub":["Classic","Vintage"]},
     "emergency":{"name":"Acil Durum / Stepne","sub_sub":["Temporary Spare","Full Size Spare"]}
   }
 }
}

/** Generated from Parcel_Types_Clean.xlsx (35 categories in English, Swahili and French; ~7,800 item words agents typed, mapped to them) by scripts in the scratchpad. Edit the workbook and regenerate rather than editing by hand. */

export type ParcelCategory = {
  key: string;
  en: string;
  sw: string;
  fr: string;
  descEn: string;
  descSw: string;
  /** How it travels, as worded in the workbook (Fragile, Keep dry, Perishable…), or null. */
  handlingEn: string | null;
  handlingSw: string | null;
  /** The label marks it suggests (fragile, keep_dry, heavy, this_side_up). */
  marks: string[];
};

export const PARCEL_TYPES_VERSION = "78a7b5c3d043";

/** What it can be packed in at the counter (sold as an extra). */
export const PACKAGING_TYPES = [
  {
    "key": "box",
    "en": "Box",
    "sw": "Boksi",
    "fr": "Carton"
  },
  {
    "key": "sack",
    "en": "Sack",
    "sw": "Kiroba",
    "fr": "Sac"
  },
  {
    "key": "crate",
    "en": "Crate",
    "sw": "Tenga",
    "fr": "Caisse"
  },
  {
    "key": "bag",
    "en": "Bag",
    "sw": "Mfuko",
    "fr": "Sac"
  },
  {
    "key": "envelope",
    "en": "Envelope",
    "sw": "Bahasha",
    "fr": "Enveloppe"
  },
  {
    "key": "bucket",
    "en": "Bucket",
    "sw": "Ndoo",
    "fr": "Seau"
  },
  {
    "key": "jerrycan",
    "en": "Jerrycan",
    "sw": "Dumu",
    "fr": "Bidon"
  },
  {
    "key": "tin",
    "en": "Tin",
    "sw": "Kopo",
    "fr": "Boîte"
  },
  {
    "key": "bundle",
    "en": "Bundle",
    "sw": "Furushi",
    "fr": "Ballot"
  },
  {
    "key": "package",
    "en": "Package",
    "sw": "Kifurushi",
    "fr": "Colis"
  }
] as const;

export const PARCEL_CATEGORIES: ParcelCategory[] = [
  {
    "key": "documents",
    "en": "Documents and letters",
    "sw": "Nyaraka na barua",
    "fr": "Documents et lettres",
    "descEn": "Letters, envelopes, certificates, ID cards, forms and other papers",
    "descSw": "Barua, bahasha, vyeti, vitambulisho, fomu na karatasi nyingine",
    "handlingEn": "Keep dry",
    "handlingSw": "Isiloane maji",
    "marks": [
      "keep_dry"
    ]
  },
  {
    "key": "books_stationery",
    "en": "Books and stationery",
    "sw": "Vitabu na vifaa vya ofisi",
    "fr": "Livres et papeterie",
    "descEn": "Books, exercise books, school supplies, paper, printed banners and stickers",
    "descSw": "Vitabu, madaftari, vifaa vya shule, karatasi, mabango na stika",
    "handlingEn": "Keep dry",
    "handlingSw": "Isiloane maji",
    "marks": [
      "keep_dry"
    ]
  },
  {
    "key": "clothing",
    "en": "Clothing and fabrics",
    "sw": "Nguo na vitambaa",
    "fr": "Vêtements et tissus",
    "descEn": "Clothes, uniforms, kitenge, fabric rolls and bales of clothes",
    "descSw": "Nguo, sare, vitenge, vitambaa na mabalo ya nguo",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  },
  {
    "key": "footwear",
    "en": "Shoes",
    "sw": "Viatu",
    "fr": "Chaussures",
    "descEn": "Shoes, sandals and boots",
    "descSw": "Viatu, sandali na buti",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  },
  {
    "key": "bags_accessories",
    "en": "Bags, watches and accessories",
    "sw": "Mabegi, saa na mapambo ya mwili",
    "fr": "Sacs, montres et accessoires",
    "descEn": "Bags, handbags, wallets, belts, watches, glasses, jewellery and hats",
    "descSw": "Mabegi, mikoba, pochi, mikanda, saa, miwani, hereni na kofia",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  },
  {
    "key": "bedding",
    "en": "Mattresses and bedding",
    "sw": "Magodoro na matandiko",
    "fr": "Matelas et literie",
    "descEn": "Mattresses, bedsheets, duvets, pillows, curtains and carpets",
    "descSw": "Magodoro, mashuka, duveti, mito, mapazia na mazulia",
    "handlingEn": "Bulky",
    "handlingSw": "Mzigo mkubwa",
    "marks": []
  },
  {
    "key": "furniture",
    "en": "Furniture",
    "sw": "Samani",
    "fr": "Meubles",
    "descEn": "Beds, tables, chairs, sofas, cupboards and shelves",
    "descSw": "Vitanda, meza, viti, sofa, makabati na rafu",
    "handlingEn": "Bulky",
    "handlingSw": "Mzigo mkubwa",
    "marks": []
  },
  {
    "key": "phones",
    "en": "Phones and accessories",
    "sw": "Simu na vifaa vyake",
    "fr": "Téléphones et accessoires",
    "descEn": "Mobile phones, chargers, covers, power banks and SIM cards",
    "descSw": "Simu, chaja, kava, power bank na laini za simu",
    "handlingEn": "Fragile",
    "handlingSw": "Inavunjika",
    "marks": [
      "fragile"
    ]
  },
  {
    "key": "computers",
    "en": "Computers and IT equipment",
    "sw": "Kompyuta na vifaa vya TEHAMA",
    "fr": "Ordinateurs et matériel informatique",
    "descEn": "Laptops, desktops, printers, routers, Wi-Fi devices, hard drives and calculators",
    "descSw": "Laptop, kompyuta, printa, ruta, vifaa vya Wi-Fi, diski na kikokotoo",
    "handlingEn": "Fragile",
    "handlingSw": "Inavunjika",
    "marks": [
      "fragile"
    ]
  },
  {
    "key": "tv_audio",
    "en": "TVs, audio and gaming",
    "sw": "Televisheni, redio na michezo ya video",
    "fr": "Téléviseurs, audio et jeux vidéo",
    "descEn": "TVs, radios, speakers, subwoofers, decoders, photo and video cameras and game consoles",
    "descSw": "TV, redio, spika, sabufa, ving'amuzi, kamera za picha na video na PlayStation",
    "handlingEn": "Fragile",
    "handlingSw": "Inavunjika",
    "marks": [
      "fragile"
    ]
  },
  {
    "key": "security",
    "en": "Security and safety systems",
    "sw": "Mifumo ya ulinzi na usalama",
    "fr": "Systèmes de sécurité et de sûreté",
    "descEn": "CCTV cameras, DVR/NVR recorders, digital and door locks, padlocks, keys, safes, alarms, fingerprint and access control, electric fence kits, GPS trackers, two-way radios, smoke detectors and fire extinguishers",
    "descSw": "Kamera za CCTV, DVR/NVR, kufuli za kidijitali na za milango, makufuli, funguo, sefu, kengele za tahadhari, vifaa vya alama za vidole na udhibiti wa kuingia, vifaa vya fensi ya umeme, vifuatiliaji vya GPS, redio za mawasiliano, vigunduzi vya moshi na vizima moto",
    "handlingEn": "Fragile",
    "handlingSw": "Inavunjika",
    "marks": [
      "fragile"
    ]
  },
  {
    "key": "appliances",
    "en": "Household appliances",
    "sw": "Vifaa vya nyumbani vya umeme",
    "fr": "Électroménager",
    "descEn": "Fridges, cookers, stoves, blenders, irons, fans, microwaves and washing machines",
    "descSw": "Friji, jiko, blenda, pasi, feni, microwave na mashine za kufulia",
    "handlingEn": "Fragile",
    "handlingSw": "Inavunjika",
    "marks": [
      "fragile"
    ]
  },
  {
    "key": "electrical",
    "en": "Electrical and solar",
    "sw": "Vifaa vya umeme na sola",
    "fr": "Matériel électrique et solaire",
    "descEn": "Cables, wires, lamps, bulbs, switches, batteries, solar panels, meters and generators",
    "descSw": "Waya, taa, swichi, betri, sola, mita na jenereta",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  },
  {
    "key": "kitchenware",
    "en": "Kitchenware and utensils",
    "sw": "Vyombo vya jikoni",
    "fr": "Ustensiles de cuisine",
    "descEn": "Pots, plates, cups, flasks, hotpots, buckets and basins",
    "descSw": "Sufuria, sahani, vikombe, chupa, hotpot, ndoo na beseni",
    "handlingEn": "Fragile",
    "handlingSw": "Inavunjika",
    "marks": [
      "fragile"
    ]
  },
  {
    "key": "food_dry",
    "en": "Dry food and groceries",
    "sw": "Vyakula vikavu",
    "fr": "Denrées sèches et épicerie",
    "descEn": "Flour, rice, beans, maize, sugar, groundnuts, honey, cooking oil, spices and other groceries",
    "descSw": "Unga, mchele, maharage, mahindi, sukari, karanga, asali, mafuta ya kupikia, viungo na bidhaa nyingine",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  },
  {
    "key": "fresh_produce",
    "en": "Fruit and vegetables",
    "sw": "Matunda na mbogamboga",
    "fr": "Fruits et légumes",
    "descEn": "Bananas, potatoes, avocados, coconuts, onions, mangoes, oranges, cassava and other fresh produce",
    "descSw": "Ndizi, viazi, parachichi, nazi, vitunguu, maembe, machungwa, mihogo na mazao mengine mabichi",
    "handlingEn": "Perishable",
    "handlingSw": "Inaharibika haraka",
    "marks": []
  },
  {
    "key": "fish_meat",
    "en": "Fish and meat",
    "sw": "Samaki na nyama",
    "fr": "Poisson et viande",
    "descEn": "Fresh or dried fish, dagaa and meat",
    "descSw": "Samaki wabichi au wakavu, dagaa na nyama",
    "handlingEn": "Perishable",
    "handlingSw": "Inaharibika haraka",
    "marks": []
  },
  {
    "key": "beverages",
    "en": "Drinks and dairy",
    "sw": "Vinywaji na maziwa",
    "fr": "Boissons et produits laitiers",
    "descEn": "Water, juice, soft drinks, milk, tea and coffee",
    "descSw": "Maji, juisi, soda, maziwa, chai na kahawa",
    "handlingEn": "Liquid",
    "handlingSw": "Kimiminika",
    "marks": [
      "this_side_up"
    ]
  },
  {
    "key": "prepared_food",
    "en": "Cooked food and bakery",
    "sw": "Vyakula vilivyopikwa na mikate",
    "fr": "Plats cuisinés et boulangerie",
    "descEn": "Cakes, bread, cooked food and snacks",
    "descSw": "Keki, mikate, chakula kilichopikwa na vitafunio",
    "handlingEn": "Perishable",
    "handlingSw": "Inaharibika haraka",
    "marks": []
  },
  {
    "key": "live_animals",
    "en": "Live animals",
    "sw": "Wanyama hai",
    "fr": "Animaux vivants",
    "descEn": "Chickens, chicks, dogs and livestock",
    "descSw": "Kuku, vifaranga, mbwa na mifugo",
    "handlingEn": "Live animals",
    "handlingSw": "Wanyama hai",
    "marks": []
  },
  {
    "key": "agriculture",
    "en": "Farming supplies",
    "sw": "Pembejeo za kilimo",
    "fr": "Intrants agricoles",
    "descEn": "Seeds, seedlings, fertiliser, hoes, sprayers, farm chemicals and animal feed",
    "descSw": "Mbegu, miche, mbolea, majembe, bomba za dawa, viuatilifu na chakula cha mifugo",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  },
  {
    "key": "medicine",
    "en": "Medicine and medical supplies",
    "sw": "Dawa na vifaa tiba",
    "fr": "Médicaments et fournitures médicales",
    "descEn": "Medicines, supplements, test kits and hospital equipment",
    "descSw": "Dawa, virutubisho, vipimo na vifaa vya hospitali",
    "handlingEn": "Keep dry",
    "handlingSw": "Isiloane maji",
    "marks": [
      "keep_dry"
    ]
  },
  {
    "key": "cosmetics",
    "en": "Cosmetics and personal care",
    "sw": "Vipodozi na urembo",
    "fr": "Cosmétiques et soins personnels",
    "descEn": "Perfume, lotion, hair products, wigs, hair extensions, shavers and salon equipment",
    "descSw": "Pafyumu, losheni, bidhaa za nywele, wigi, rasta, mashine za kunyolea na vifaa vya saluni",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  },
  {
    "key": "cleaning",
    "en": "Soap and cleaning products",
    "sw": "Sabuni na vifaa vya usafi",
    "fr": "Savons et produits d'entretien",
    "descEn": "Soap, detergents, tissue, toilet items and cleaning supplies",
    "descSw": "Sabuni, dawa za kusafishia, tishu na vifaa vya usafi",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  },
  {
    "key": "vehicle_parts",
    "en": "Vehicle spare parts",
    "sw": "Vipuri vya magari",
    "fr": "Pièces détachées automobiles",
    "descEn": "Car parts, tyres, engines, gearboxes, filters, bumpers, bearings and lubricants",
    "descSw": "Spea za gari, matairi, injini, gearbox, filta, bampa, bearing na grisi",
    "handlingEn": "Heavy",
    "handlingSw": "Mzito",
    "marks": [
      "heavy"
    ]
  },
  {
    "key": "motorcycle_bicycle",
    "en": "Motorcycles, bicycles and parts",
    "sw": "Pikipiki, baiskeli na vipuri vyake",
    "fr": "Motos, vélos et pièces",
    "descEn": "Motorcycles, bicycles and their spare parts",
    "descSw": "Pikipiki, baiskeli na vipuri vyake",
    "handlingEn": "Heavy",
    "handlingSw": "Mzito",
    "marks": [
      "heavy"
    ]
  },
  {
    "key": "machinery_tools",
    "en": "Machines and tools",
    "sw": "Mashine na zana",
    "fr": "Machines et outils",
    "descEn": "Water pumps, sewing machines, welding machines, drills, compressors, chainsaws and hand tools",
    "descSw": "Pampu za maji, cherehani, mashine za kuchomelea, drili, kompresa, chensoo na zana za mkono",
    "handlingEn": "Heavy",
    "handlingSw": "Mzito",
    "marks": [
      "heavy"
    ]
  },
  {
    "key": "building",
    "en": "Building materials and hardware",
    "sw": "Vifaa vya ujenzi",
    "fr": "Matériaux de construction et quincaillerie",
    "descEn": "Pipes, iron bars, roofing sheets, cement, tiles, paint, timber, doors, glass and fittings",
    "descSw": "Mabomba, nondo, mabati, saruji, vigae, rangi, mbao, milango, vioo na vifaa",
    "handlingEn": "Heavy",
    "handlingSw": "Mzito",
    "marks": [
      "heavy"
    ]
  },
  {
    "key": "baby_toys",
    "en": "Baby products and toys",
    "sw": "Bidhaa za watoto na midoli",
    "fr": "Articles pour bébés et jouets",
    "descEn": "Diapers, baby items and toys",
    "descSw": "Pampasi, vifaa vya watoto na midoli",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  },
  {
    "key": "sports_music",
    "en": "Sports and musical instruments",
    "sw": "Michezo na vyombo vya muziki",
    "fr": "Sport et instruments de musique",
    "descEn": "Balls, jerseys, gym equipment, guitars and keyboards",
    "descSw": "Mipira, jezi, vifaa vya mazoezi, gitaa na kinanda",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  },
  {
    "key": "gifts_decor",
    "en": "Gifts and decorations",
    "sw": "Zawadi na mapambo",
    "fr": "Cadeaux et décoration",
    "descEn": "Gifts, flowers, framed pictures, mirrors and decorations",
    "descSw": "Zawadi, maua, picha, vioo vya ukutani na mapambo",
    "handlingEn": "Fragile",
    "handlingSw": "Inavunjika",
    "marks": [
      "fragile"
    ]
  },
  {
    "key": "hazardous",
    "en": "Gas, fuel and chemicals",
    "sw": "Gesi, mafuta ya injini na kemikali",
    "fr": "Gaz, carburants et produits chimiques",
    "descEn": "Gas cylinders, fuel, paint thinner, acids and other chemicals; check before accepting",
    "descSw": "Mitungi ya gesi, mafuta ya injini, tina, asidi na kemikali nyingine; kagua kabla ya kupokea",
    "handlingEn": "Dangerous goods",
    "handlingSw": "Bidhaa hatari",
    "marks": []
  },
  {
    "key": "mixed",
    "en": "Mixed household goods",
    "sw": "Mzigo mchanganyiko",
    "fr": "Marchandises diverses",
    "descEn": "Assorted household items sent together, such as a village parcel (shangazi kaja)",
    "descSw": "Vitu mbalimbali vya nyumbani, kama mzigo wa shangazi kaja",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  },
  {
    "key": "unspecified",
    "en": "Sealed package, contents not stated",
    "sw": "Mzigo uliofungwa, ndani haijulikani",
    "fr": "Colis fermé, contenu non déclaré",
    "descEn": "Box, sack, bag or envelope where the contents were not written",
    "descSw": "Boksi, kiroba, mfuko au bahasha bila maelezo ya ndani",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  },
  {
    "key": "other",
    "en": "Other",
    "sw": "Mengineyo",
    "fr": "Autres",
    "descEn": "Items that do not fit another category",
    "descSw": "Bidhaa zisizoingia kundi lingine",
    "handlingEn": null,
    "handlingSw": null,
    "marks": []
  }
];

/** Words agents have used for what's inside (English and Swahili, as typed), by category: the app searches them. */
export const PARCEL_TERMS: Record<string, string[]> = {"fresh_produce": ["eggs", "embe", "kipeto viazi", "limao", "maboga", "machungwa", "maembe", "mafuta nazi", "magimbi", "magimbi parachichi", "maparachichi", "matunda", "mayai", "mboga", "mboga mboga", "migomba", "mihogo", "miogo", "miwa", "nazi", "nazi ndizi", "ndimu", "ndiz", "ndizi", "ndizi parachichi", "nyanya", "pala chichi", "palachichi", "parachichi", "tangawizi", "trey mayai", "uyoga", "viaz", "viazi", "viazi ndizi", "vipeto magimbi", "vitunguu"], "appliances": ["air condition", "air condition ndogo", "air conditioner", "air conditioning deli", "air frayer", "air fry", "airfleyer", "airfray", "airfry", "birika", "blander", "blenda", "blender", "burner", "diana washing machine", "dispenser", "draya", "fan", "fen", "fen bert", "feni", "feni ndogo", "flij", "flij ndogo", "fliji", "fliji dastebo", "fly jiko", "freezer", "fridge", "frij", "friji", "friza", "grenda", "grender", "grender used", "handfan", "head fen", "heater", "hita", "ice cooker", "jiko", "majiko", "micro wave", "microwave", "microwave oven", "mixer", "mixer machine", "mult cooker", "oven", "pasi", "power mixer", "pressure washer", "pretty jiko", "refrigerator", "vacum", "washer", "washing machine"], "vehicle_parts": ["air filter", "automobile parts", "bampa", "bearing", "bering", "boat engine", "bolt", "brake pedal", "break", "break sho", "break shuu", "bush", "car accessories", "car engine", "car seat", "car spare parts", "car spares", "clutch", "cylinder", "cylinder head", "dash board", "dashboard", "dpear", "driveshaft", "engine", "engine oil", "filita", "filta", "filter", "flista", "flita", "frita", "gasket", "gasket kit", "gasscate", "gear", "gearbox", "giabox", "grease", "gris", "half engine", "hose", "injini", "kispare", "kispea", "mirror", "mota", "motor", "nozeri", "number", "oil filter", "piston", "pletnambar", "rear shock", "rear shock up", "reflector", "rejeta", "rejetor", "rim", "rimu", "rubber bush", "seat", "seat cover", "seat covers", "sent mirror", "shaft", "shock up", "shokap", "side mirror", "sipea", "site mirror", "spaire", "spare bush", "spares", "spe", "speq", "sper", "sper kabreta", "sprare", "springi", "starta", "starter", "tail", "taili", "tair", "tairi", "tairi ndogo", "tairi tube", "tairi uzd", "tairy", "tairy uzd", "tractor", "trubo", "turbo", "turvo", "tyre", "tyre ndgo", "tyres", "vispare", "yamaha", "yu bolt"], "baby_toys": ["baby kelia", "baby show", "baby stuff", "baby supplies", "baby toy", "baby toys", "baby walker", "baby woka", "baby worker", "kibubu", "mdoli", "mdori", "midoli", "midori", "pampas", "pampasi", "pempas", "roba mdori", "tois", "toy", "toys", "vifaa vyo mtoto"], "documents": ["bahasha", "balua", "barua", "bima", "cadi", "cheki", "chet", "cheti", "cheti origion", "cm kitambulisho", "dockomenti", "docoment", "document", "documents", "documents cv", "dokoment", "file", "files", "fom", "fomu", "form", "form board", "form body", "hati", "ina documents", "ina vyeti", "kitambulisho", "kitambulisho nida", "leseni", "list", "medical form", "mitihani", "mkataba", "mtihani", "muhuri", "nida", "nida id", "normal document", "nyaraka", "passport", "risiti", "uamisho", "uhamisho", "vitambulisho", "vyet", "vyeti", "vyeti og", "vyeti vyakazini"], "clothing": ["bag-nguo", "bags nguo", "balo", "balo mtumba", "begi lina nguo", "begi nguo", "bola nguo", "boxer", "branding material", "buty", "cheusi nguo", "chupi", "clothes", "clothing", "fabric", "fabric rolls", "fabrics", "gauni", "gunny", "guo", "henga nguo", "ina nguo", "jacket", "jeans", "jez", "jezi", "kanga", "kanzu", "khanga", "kibegi nguo", "kifuko nguo", "kifuko sweta", "kifungashio nguo", "kiloba nguo", "kipeto nguo", "kitambaa", "kitenge", "koti", "leso", "loba nguo", "madera", "mafta begi nguo", "mafta nguo", "mafuta nguo", "material", "mavazi", "mitumba", "mtumba", "ngio", "ngu", "ngua", "ngui", "nguo", "nguo chakavu", "nguo cm", "nguo cm ndogo", "nguo kifuko", "nguo mafuta", "nguo mix", "nguo mpya", "nguo nabrenda", "nguo ndani", "nguo nguo", "nguo nyingi", "nguo t-shert", "nguo t-shirt", "nguo tu", "nguo ua", "nguo used", "nguo uzd", "nguo vijora", "nguo vitenge", "nguo vitu", "nguo zaman", "nguo zilizotumika", "nguo zilizovaliwa", "nguo zilizovaliwq", "nguo zimetumika", "nguo zishavaliwa", "nguoo", "nhuo", "promotion material", "roba nguo", "roba vitambaa", "sare", "shati", "shikaja nguo better", "soksi", "suruali", "suti", "suty", "sweta", "t shert", "t shet", "t shirt", "t shirts", "t-shert", "t-shirt", "taulo", "tishet", "tisheti", "tranka nguo", "tshert", "tshet", "tshirt", "tshirts", "tsht", "ulnguo", "una nguo", "uniform", "vijola vs vitambaa", "vitambaa", "vitenge"], "electrical": ["adapter", "adopta", "bao meter", "batteries", "battery", "betree", "betri", "betri n", "betri terminals", "bettery", "binding wire", "booster", "bulb", "busta", "buster", "cable", "cables", "clamp meter", "controler", "convertor", "dim light", "electrical cables", "element", "exposure switch", "extension", "flow meter oxygen", "generator", "generators", "inverter", "invetor", "jenereta", "kevin buster", "kifaa umeme", "kioo taa", "light", "lop wire", "mabetre", "meter", "meter resistance", "mita", "moisture meter", "network switches", "pawa mita", "sensa", "sensor", "socket", "sola", "solar", "solar betri", "solor taa", "spea taa", "stabilizer", "stable raizar", "stabraizer", "standing light", "strip light", "sub meter", "switch", "taa", "taa bulb", "taa solar", "taa solor", "tape cable", "umeme", "una cable", "v. umeme", "vifaa jenereta", "vifaa umeme", "vifaa vy umeme", "vifaa vyo umeme", "waya", "waya adapta", "waya wa guta", "waya wa machine", "waya wa umeme", "wire", "wires"], "bedding": ["bedcaver", "bedsheets", "blanket", "bofa pazia", "capet", "carpet", "carpet sh kaja", "chakula godoro", "chandarua", "curtains", "duvet", "duvet shuka", "duveti", "foronya", "godogoro dogo.net.beg dogo", "godolo", "godolo jaba", "godor", "godoro", "godoro diaba", "godoro ges", "godoro inchi", "godoro nch", "godoro ndogo", "godoro used", "kapet", "kapeti", "kapeti ndogo", "kiloba duveti", "kiloba kina mikeka", "kroba zulia", "mapazia", "mashuka", "mashuka tu", "mazulia", "mikeka", "miti mapazia", "mito", "mkeka", "mto", "mto wa kuegema", "net", "neti", "panzia", "pazia", "shuka", "soft blanket", "zulia", "zulia bana", "zuria"], "beverages": ["bags maj", "beverages", "coffee", "juice", "kahawa", "kifaa maji", "kifungashio maj", "maj", "majani chai", "majaniya chai", "maji", "maji ipako", "maji mafuta", "maji upako", "maziwa", "pombe", "roasted coffee", "soft coffee", "soft kahawa", "vinywaji", "water", "water bar", "water gun", "water proof", "water pump", "wine"], "motorcycle_bicycle": ["baiskel", "baiskel ndogo", "baiskel used", "baiskeli", "bajaji", "baskel", "baskeli", "bicycle", "bicycles", "cover ta pikpik", "helmet", "piki pik", "piki piki", "pikipik", "pikipik used", "pikipiki", "pikipiki mdz-b15", "pikipiki ndgo", "pikipiki used", "pikpik", "pk pk", "pkpk", "spea pkpk"], "building": ["alminiam", "aluminium", "bati", "bati steel", "blastic", "block", "bomba", "boriti", "bricks", "cement", "choo", "chuma", "chuma uzd", "connector", "fitting pipe", "flem", "gabion", "grill", "grout", "gundi", "hardware", "hozz pipe", "jiwe", "kamba", "kichuma", "kiloba chuma", "kokoto", "langi", "mabati", "mabomba", "mbao", "milango", "misumari", "mkaa", "mlango", "nati", "ngazi", "nguzo", "nondo", "paipu", "pipe", "pipes", "plasstics", "plastic", "plastic botto", "plastic cup", "plastik", "prastik", "pvc", "rangi", "rangi ndogo", "rangi rangi", "screw", "screws", "shaba", "sink", "sinki", "tent", "tepu", "tiles", "tiles kokoto", "tofali", "tulubai", "turubai", "valve", "vifaa aluminium", "vifaa mlango", "vifaa vyo bomba", "vigae", "vitu mbao", "vyuma", "wallpaper", "wavu", "white cement"], "food_dry": ["asali", "biscuits", "biskuti", "blueband", "cereals", "chakul", "chakula lishe", "chocolate", "chumvi", "cooking oil", "dengu", "flavour", "fleva", "furush mchere", "glucose", "groceries", "karanga", "karanga ngano", "kashata drayfood", "kifuko unga", "kifungashio lishe", "kiloba mchele", "kipeto maharage", "kipeto mahindi", "kipeto mchele", "kipeto unga", "kipeto unga mahindi", "koroba mchele", "korosho", "korosho p", "lishe", "mafura", "mafut", "mafutq", "maharage", "mahind", "mahindi", "mahindi maharage", "mahindi unga", "maindi", "maindi marage", "marage", "mchele", "mchele mafuta sukari", "mchele maharage", "mchele nusu kiloba", "mchele vs sukari", "mchere", "michele", "mpunga", "mtama", "muchele", "nafaka", "ndo unga", "ndoo..flavour", "ndz maharage", "ngano", "ngano yamafuta", "njegere", "njegere mahind", "peanut", "pili pili", "pilipili", "pilipili hoho", "pipi", "pop corn machine", "sausage", "sigara", "soseji", "soya", "sukari", "tambi", "temde mchere", "tende", "tiba lishe", "ubuyu", "ugoro", "unga", "unga lishe", "unga mafuta", "unga maharage", "unga mahindi", "unga mchele", "unga wa lishe", "ungaa", "ungaa mchere", "ungalishe", "ungu lishe", "viloba 3vya mchele", "vipeto mahindi", "vipeto mchele", "vipeto nafaka", "vipeto unga", "viungo", "vyakul"], "hazardous": ["chemical", "chemicals", "gesi", "kiberiti", "mitungi", "mtungi", "mtungi wa gas", "spare diesel", "tina", "vifaa gas"], "machinery_tools": ["air compressor", "cheleani", "chenso", "chenso ndogo", "chereani", "cherehani", "class cutter", "compresa", "compressor", "condenser", "construction equipment", "construction tools", "drill", "drill machine", "driri mchine", "electronic tools", "jigsaw", "kimashine", "kisalfety", "kisu", "lola", "machine", "machine kuchomelea", "machine mixa", "machinw", "madhine", "mashine", "mashine cm", "mashine efd", "mashine kubwa", "mashine kufulia", "mashine used", "mashine yakufulia", "mashn", "mchine", "medical tools", "mizan", "mizani", "msasa", "msumeno", "multimeter", "mzani", "mzani ning'iniza juu", "nyundo", "rock drill machine", "rola", "roller", "rora", "safe", "safety", "safety ndogo", "safety rola", "salfety", "salfety way", "screpa", "senyenge", "spana", "spear yaku drill", "theodolite", "tools", "tools kits", "toroli", "vibrator", "vifaa cherehani", "visu", "welding", "welding machine"], "cosmetics": ["air dryer", "body loshen", "brashi", "cosmetics", "dryer", "hina", "ice cream", "joho", "kibanio", "kifuko wigi", "kifungashio urembo", "kucha", "lasta", "lipstick", "loshen", "losheni", "lotion", "mafta vipodozi", "mafuta lotion", "mafuta pafyum", "makeup", "manukato", "meno", "mswaki", "nywele", "pad", "pads", "pafym", "pafyum", "pafyumu", "perfume", "rasta", "saloon", "shampoo", "udi", "urembo", "uzi", "vibanio", "vifaa urembo", "vifaa vyo salun", "vipodoz", "vipodozi", "vyakunyolea", "wig", "wigi"], "gifts_decor": ["christmas tree", "decor items", "decoration", "fimbo", "fimbo tufe", "frame", "gift ribon", "home decor", "mapambo", "mapambo yang kake", "maua", "mauwa", "misalaba", "mishumaa", "msalaba", "pambo", "picha", "picha begi", "picha kioo", "picture", "snap frame", "stamp", "tuzo", "ubani", "vinyago", "zawadi"], "computers": ["ad disc", "add disc", "add disk", "begi", "bill counter", "calculator", "calculeta", "computer", "computer external", "computer spare", "cpu", "dell", "desk top", "desktop", "disc", "disk", "disk drive", "epson printer ndogo", "excel", "exel", "external", "external case", "external drive", "faiba", "fiber", "flash", "gps", "h.p", "had disc", "had disk", "hard disc", "hard disk", "harddisk", "hdd", "home wi-fi", "housing desktop", "internet items", "key board", "keyboard", "kifaa wifi", "kifuko router wi-fi", "kifuko wf", "kifungashio wi-fi", "lap top", "laptop", "laptop dell", "laptop hp", "laptop mbovu", "laptop used", "laptops", "mark bill", "mini projector", "monitor", "mouse", "notebook", "p o s", "pc hp", "pc imetumika", "pc mafta", "pc mbovu", "pc used", "pos", "printa", "printer", "projector", "raptop", "rauta", "router", "router wi-fi", "screen projector", "spya", "sub printer", "toner", "tvs", "tvs sterx hlx125", "ups", "vifaa faiba", "waif", "waifa", "wi fi", "wi fi router", "wi-fi", "wi.f", "wi.fi", "wif", "wife", "wifi"], "cleaning": ["air clean", "air cleaner", "airfresh", "banking powder", "brush", "clean solution", "cleaner", "detergents", "gysam powder", "ina sabuni", "mop", "ndooo sabuni", "powder", "sabun", "sabuni", "soap", "tishu", "vifaa nya usafi", "vifaa usafi"], "medicine": ["amonium", "bahash yenye dawa", "bix dawa", "bp machine", "bp test", "calcium", "chanjo", "daw", "dawa", "dawa asilia", "dawa kienyej8", "dawa kienyeji", "dawa kifuko", "dawa mafuta", "dawa raba", "dawa zashambani", "dawq", "dwa", "forever dawa", "gloves", "kdom dawa", "kidumu dawa", "kifuko dawa", "kifungashio dawa", "kifungashio dawa kienyeji", "kiloba dawa", "kipimo", "kipimo presha", "mafuta dawa", "mchande", "medicine", "ppe", "presha coca", "presha control", "presha kuka", "programmer hospital", "sindano", "supplement", "vidonge", "vifaa tiba", "vimiminika", "vipimo", "virutubisho"], "phones": ["apple", "atm kava", "bahasa simu", "bix vifaa simu", "car cava", "cava", "cava zasimu", "cavaza simu", "chaja", "chaji", "chaji kava", "charge", "charger", "charger control", "cim", "cimu", "cm huawei", "cm i phone", "cm infinix", "cm infinix used", "cm iphone", "cm iphone usee", "cm itel", "cm oppo", "cm phone", "cm pixel", "cm samsan s9", "cm samsung", "cm samsung c10", "cm samsung galaxy", "cm samsung used", "cm sumsung", "cm sumsung a06", "cm tecno", "cm used iphone", "cm vivo", "covers phone", "ear pods", "earphone", "earphones", "edifon", "electronic gadgets", "electronic phone", "glass protector", "google picel", "google pixel", "google pixel 7a", "google pixel used", "he'd fon", "head phone", "hedfon", "huawei", "ina chaji", "ina line", "infinix", "infinix used", "iphone", "iphone pro", "itel", "kanazawa simu", "kava", "kava nyeusi", "kava simu", "kavazasimu", "kibx simu", "kisimu", "lain", "lain halotel", "laini", "line", "makava", "phone", "phone cover", "phone covers", "phone huwawei", "phones cover", "pods", "power bank", "powerbank", "protector", "redmi used", "sam sung", "samsan", "samsan s", "samsan s9", "samsung", "samsung a06", "samsung a07", "samsung a071 used", "samsung note", "samsung s10", "samsung used", "sim", "sim ndogo", "sim used", "sim vivo", "sim yuzid", "simu", "simu card", "simu g px", "simu google pixel", "simu infinix", "simu iphone", "simu mbovu", "simu moja", "simu ndogo", "simu samsung", "simu samsung a05", "simu samsung a14", "simu smart", "simu sumsang", "simu tecno used", "simu used", "simu vivo", "sisitim chaja", "siti kava", "sm infinix1", "sm pixel", "smartphone", "spea sim", "sumsung", "system charger", "tablet", "tecno", "tecno spark", "telephone", "u.s.b chaji", "used mobile phone", "utumbo wa simu", "vifaa nya simu", "vifaa vyo simu", "vifaaa vyo simu", "vioo vyo simu"], "tv_audio": ["adroid tv", "amplifier", "antena", "bufa", "decoda", "dish", "dish beg", "dish usee", "dishi", "dishi tv", "display", "dvd", "electronics", "game", "game machine", "game mashine", "jaradio", "kikabat redio", "kiloba ps", "king'amuzi", "king'amzi", "ledio", "lens", "maandishi 3d", "mic", "microphone", "midomo spika", "mwandishi", "mziki", "ngoma", "playstation", "ps beg", "radio", "radio b03", "radio cal", "radio hisense", "receptor", "redio", "remote", "rimor", "rimot", "sabufa", "sabufa imetumika", "sabufa speka", "saket tv", "smart tv", "sony", "sound", "sound bar", "sound card", "sounds bar", "spare tv", "speak", "speaker", "speakers", "spika", "spiker", "subwoofer", "television", "tiv", "tivi", "tv better", "tv flati", "tv hisense", "tv imetumika", "tv inc", "tv inch", "tv kifuko", "tv lg", "tv mbovu", "tv nadishi", "tv naredio", "tv nch", "tv nchi", "tv nh", "tv radio", "tv redio", "tv used", "tv 📺", "u p s"], "agriculture": ["chia seeds", "farming equipment", "fertilizer", "grass", "incubator", "inkubeta", "jembe", "kifungashio pumba", "kiloba kina mbegu", "majembe", "mbegu", "mbolea", "mchanga", "miche", "michembe", "miti shamba", "mti", "nyavu", "pumba", "sprinkler", "udongo"], "security": ["alam", "alarm", "camer", "camera", "cctv camera", "dvr", "fere extinguisher", "fingerprint", "fire extinguisher", "fire extinguishers", "fire extinhuisher", "funguo", "kamela", "kamera", "kitasa", "kufuli", "lock", "makufuli", "n vr", "pingu", "ufunguo", "vifaa camera", "vifaa cctv", "vitasa"], "fish_meat": ["bix samak", "dagaa", "dagaa cm ndogo", "dagaa mafuta", "dagaa n bagi", "dagaa samak", "dagaa samaki", "dagaa wakukaanga", "fish feed", "fish tank", "fishing gear", "jaba samaki", "kapenti", "nyama", "pweza", "samak", "samak dagaa", "samaki", "samaki chakula"], "kitchenware": ["besen", "beseni", "c.plat", "chombo", "chupa", "chupa kioo", "chupa tupu", "dustbin", "food containers", "glassware", "hot poat", "hot pot", "hotpot", "jag", "jagi", "jug", "karai", "kifungashio jag", "kikombe", "kitchen mat", "kitchenware", "majag", "majagi", "mbebeo", "mfuniko", "plastics", "plate", "plate no", "plet", "plet nomber", "sahani", "sufulia", "sufuria", "trei", "vifaa vyombo", "vijiko", "vikombe", "viombo", "vyombo", "vyombo kioo"], "furniture": ["bed", "bedi sofa", "cabinet", "chair", "deki", "frem", "furniture", "kabati", "kabineti", "kichanja", "kitanda", "kiti", "mable", "meza", "meza kioo", "meza viromba", "meza viti", "office chair", "roba kitanda jaba", "show case", "showcase", "side bed", "side table", "sofa", "stand", "stend", "stendi", "stuli", "table", "vitanda", "viti", "wheel chair", "wheel chair used"], "sports_music": ["drum", "gitaa", "gitaa used", "guitar", "gym equipment", "kifaa mazoezi", "kinanda", "mazoezi", "mipila", "mipira", "mpira", "piano", "swimming pol", "vifaa mazoezi"], "live_animals": ["bata", "chakula kuku", "kuku", "mbwa", "njiwa", "penat bata", "vifaranga", "vifaranga wa bata", "vitamin mifugo"], "bags_accessories": ["accessories", "accessorise", "acessories", "belt", "bracelet", "cheni", "hereni", "kiba pochi", "kidani", "kifungashio poch", "kifungashio saa", "kofia", "mikanda", "mikoba", "mitandio", "miwani", "mkanda", "mkanda wa mgongo", "mkanda wa saa", "mkoba", "mkoba saa", "mwamvuli", "mwavuli", "pete", "poch", "pochi", "ring", "rist", "saa", "skaf", "skafu", "smart watch", "smart watches", "sports accessories", "una pochi", "wallet"], "footwear": ["begi viatu", "boot", "boot overall", "buti", "doc viatu", "kiatu", "kiatu namafuta", "kifuko viatu", "kifungashio viatu", "kilosa viatu", "loba viatu", "mafuta viatu", "rain boot", "roba viatu", "sandals", "seft boot", "sefti buti", "sendo", "shoe rack", "shoo", "shoo kes", "shoo kesi", "vi atu", "viat", "viati", "viatu", "viatu begi", "viatu kifuko", "viatu pair", "viatu pea", "viatu tu", "viatu v"], "mixed": ["jaba shangazikaja", "kipeto shangazikaja", "kishangazi kaja", "kisokon eb", "kisokon mashine", "kisokon spey", "mchanganyiko", "shangaz kaj", "shangaz kaja", "shangaz kaja roba", "shangazi kaj", "shangazi kaja", "shangazi kaja dogo", "shangazi kaja2", "shangazikaja", "shanghai kaja", "spear sokon", "supa sokon", "supa sokoni", "supa sokonj", "supar sokon", "supar sokoni", "supasokoni", "super sokon", "super sokoni", "supersokon", "supersokoni", "supey sokon", "vitu mchanganyiko", "viàtu"], "books_stationery": ["bando", "bango", "banner", "bible", "biblia", "book", "book cover", "book let", "calendar", "cm kitabu", "copy", "daftari", "diary", "herufi 3d", "ina karatasi", "invoice", "kalatas", "kalatasi", "kalenda", "karatasi", "karatasi kioo", "kibix vitabu", "kifungashio print", "kitabu", "koki", "lamination paper", "lim paper", "log books", "mabango", "madaftar", "madaftar vifaaa", "madaftari", "matangazo", "paper", "paper cups", "papers", "past papers", "pen", "photo book", "photos paper", "print", "printed", "ripot", "rula", "stationary", "stationary parts", "stationary vifaa", "statonaries", "sticker", "stickers", "stika", "transcript", "vifaa stationary", "vifaa vya.shule", "vipeperushi", "vitabu", "vitabu biblia", "voucher book", "wino"], "prepared_food": ["bites", "cake", "cake packaging", "cakes", "capcake", "chapati", "cup cake", "keki", "maandazi", "mikate", "v. cake", "vifaa cake", "vifaa cya keki", "vifaa keki", "vifaa via keki", "vifaa vy keki", "vifaa vyaa keki", "vifaa vyakutengenezea cake", "vifaa vyakutengenezea keki"]};

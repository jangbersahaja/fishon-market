// Unified species data for TripSpeciesSection and related UI components

export const SPECIES_CATEGORIES = {
  SALTWATER: "saltwater",
  FRESHWATER: "freshwater",
  SQUID: "squid",
} as const;

export type SpeciesCategory =
  (typeof SPECIES_CATEGORIES)[keyof typeof SPECIES_CATEGORIES];

export interface SpeciesItem {
  id: string;
  english_name: string;
  local_name: string;
  image: string; // Always a public path string (e.g., /images/species/saltwater/xxx.png)
  category: SpeciesCategory;
}

// --- Saltwater Species ---
const SALTWATER_SPECIES = [
  {
    id: "cobia",
    english_name: "Cobia",
    local_name: "Aruan Tasik",
    image: "/images/species/saltwater/Aruan Tasik (Cobia).png",
  },
  {
    id: "golden-pomfret",
    english_name: "Golden Pomfret",
    local_name: "Bawal Emas",
    image: "/images/species/saltwater/Bawal Emas (Golden Pomfret).png",
  },
  {
    id: "black-pomfret",
    english_name: "Black Pomfret",
    local_name: "Bawal Hitam",
    image: "/images/species/saltwater/Bawal Hitam (Black Pomfret).png",
  },
  {
    id: "hardtail-scad",
    english_name: "Hardtail Scad",
    local_name: "Cencaru",
    image: "/images/species/saltwater/Cencaru (Hardtail Scad).png",
  },
  {
    id: "diamond-trevally",
    english_name: "Diamond Trevally",
    local_name: "Ebek",
    image: "/images/species/saltwater/Ebek (Diamond Trevally).png",
  },
  {
    id: "croaker",
    english_name: "Croaker",
    local_name: "Gelama",
    image: "/images/species/saltwater/Gelama (Croaker).png",
  },
  {
    id: "grunter",
    english_name: "Grunter",
    local_name: "Gerut",
    image: "/images/species/saltwater/Gerut (Grunter).png",
  },
  {
    id: "indian-trevally",
    english_name: "Indian Trevally",
    local_name: "Ikan Cermin",
    image: "/images/species/saltwater/Ikan Cermin (Indian Trevally).png",
  },
  {
    id: "marine-catfish",
    english_name: "Marine Catfish",
    local_name: "Ikan Duri",
    image: "/images/species/saltwater/Ikan Duri (Marine Catfish).png",
  },
  {
    id: "giant-trevally",
    english_name: "Giant Trevally",
    local_name: "Ikan GT",
    image: "/images/species/saltwater/Ikan GT (Giant Trevally).png",
  },
  {
    id: "red-snapper",
    english_name: "Red Snapper",
    local_name: "Ikan Merah",
    image: "/images/species/saltwater/Ikan Merah (Red Snapper).png",
  },
  {
    id: "golden-snapper",
    english_name: "Golden Snapper",
    local_name: "Jenahak",
    image: "/images/species/saltwater/Jenahak (Golden Snapper).png",
  },
  {
    id: "indian-mackerel",
    english_name: "Indian Mackerel",
    local_name: "Kembung",
    image: "/images/species/saltwater/Kembung (Indian Mackerel).png",
  },
  {
    id: "grouper",
    english_name: "Grouper",
    local_name: "Kerapu",
    image: "/images/species/saltwater/Kerapu (Grouper).png",
  },
  {
    id: "threadfin",
    english_name: "Threadfin",
    local_name: "Kurau",
    image: "/images/species/saltwater/Kurau (Threadfin).png",
  },
  {
    id: "sailfish",
    english_name: "Sailfish",
    local_name: "Layaran",
    image: "/images/species/saltwater/Layaran (Sailfish).png",
  },
  {
    id: "mahimahi",
    english_name: "Mahimahi",
    local_name: "Mahimahi",
    image: "/images/species/saltwater/Mahimahi.png",
  },
  {
    id: "daggertooth",
    english_name: "Daggertooth",
    local_name: "Malong",
    image: "/images/species/saltwater/Malong (Daggertooth).png",
  },
  {
    id: "marlin",
    english_name: "Marlin",
    local_name: "Mersuji",
    image: "/images/species/saltwater/Mersuji (Marlin).png",
  },
  {
    id: "rayfish",
    english_name: "Rayfish",
    local_name: "Pari",
    image: "/images/species/saltwater/Pari (Rayfish).png",
  },
  {
    id: "salmon",
    english_name: "Salmon",
    local_name: "Salmon",
    image: "/images/species/saltwater/Salmon.png",
  },
  {
    id: "yellowtail-scad",
    english_name: "Yellowtail Scad",
    local_name: "Selar",
    image: "/images/species/saltwater/Selar (Yellowtail Scad).png",
  },
  {
    id: "sardine",
    english_name: "Sardine",
    local_name: "Selayang",
    image: "/images/species/saltwater/Selayang (Sardine).png",
  },
  {
    id: "eeltail-catfish",
    english_name: "Eeltail Catfish",
    local_name: "Semilang",
    image: "/images/species/saltwater/Semilang (Eeltail Catfish).png",
  },
  {
    id: "fourfinger-threadfin",
    english_name: "Fourfinger Threadfin",
    local_name: "Senangin",
    image: "/images/species/saltwater/Senangin (Fourfinger Threadfin).png",
  },
  {
    id: "barramundi",
    english_name: "Barramundi",
    local_name: "Siakap",
    image: "/images/species/saltwater/Siakap (Barramundi).png",
  },
  {
    id: "mangrove-jack",
    english_name: "Mangrove Jack",
    local_name: "Siakap Merah",
    image: "/images/species/saltwater/Siakap Merah (Mangrove Jack).png",
  },
  {
    id: "queenfish",
    english_name: "Queenfish",
    local_name: "Talang",
    image: "/images/species/saltwater/Talang (Queenfish).png",
  },
  {
    id: "anchovy",
    english_name: "Anchovy",
    local_name: "Tamban",
    image: "/images/species/saltwater/Tamban (Anchovy).png",
  },
  {
    id: "russells-snapper",
    english_name: "Russell's Snapper",
    local_name: "Tanda",
    image: "/images/species/saltwater/Tanda (Russell’s Snapper).png",
  },
  {
    id: "sweetlip-emperor",
    english_name: "Sweetlip Emperor",
    local_name: "Tebal Sisik",
    image: "/images/species/saltwater/Tebal Sisik (Sweetlip Emperor).png",
  },
  {
    id: "spanish-mackerel",
    english_name: "Spanish Mackerel",
    local_name: "Tenggiri",
    image: "/images/species/saltwater/Tenggiri (Spanish Mackerel).png",
  },
  {
    id: "needlefish",
    english_name: "Needlefish",
    local_name: "Todak",
    image: "/images/species/saltwater/Todak (Needlefish).png",
  },
  {
    id: "mackerel-tuna",
    english_name: "Mackerel Tuna",
    local_name: "Tongkol",
    image: "/images/species/saltwater/Tongkol (Mackerel Tuna).png",
  },
  {
    id: "tuna",
    english_name: "Tuna",
    local_name: "Tuna",
    image: "/images/species/saltwater/Tuna.png",
  },
  {
    id: "shark",
    english_name: "Shark",
    local_name: "Yu",
    image: "/images/species/saltwater/Yu (Shark).png",
  },
  {
    id: "barracuda",
    english_name: "Barracuda",
    local_name: "Alu-Alu",
    image: "/images/species/saltwater/new-28-10-25/Alu-Alu - Barracuda.png",
  },
  {
    id: "flat-needlefish",
    english_name: "Flat Needlefish",
    local_name: "Banang",
    image:
      "/images/species/saltwater/new-28-10-25/Banang - Flat Needlefish.png",
  },
  {
    id: "black-snapper",
    english_name: "Black Snapper",
    local_name: "Blackbass",
    image:
      "/images/species/saltwater/new-28-10-25/Blackbass - Black Snapper.png",
  },
  {
    id: "big-eye-trevally",
    english_name: "Big Eye Trevally",
    local_name: "Cupak",
    image:
      "/images/species/saltwater/new-28-10-25/Cupak - Big Eye Travelly.png",
  },
  {
    id: "bluefin-trevally",
    english_name: "Bluefin Trevally",
    local_name: "Gerepoh Sirip Biru",
    image:
      "/images/species/saltwater/new-28-10-25/Gerepoh Sirip Biru - Bluefin Travelly.png",
  },
  {
    id: "golden-trevally",
    english_name: "Golden Trevally",
    local_name: "Gerung Belang",
    image:
      "/images/species/saltwater/new-28-10-25/Gerung Belang - Golden Travelly.png",
  },
  {
    id: "goldspotted-trevally",
    english_name: "Goldspotted Trevally",
    local_name: "Jemuduk",
    image:
      "/images/species/saltwater/new-28-10-25/Jemuduk - Goldspotted Travelly.png",
  },
  {
    id: "diagramma-pictum",
    english_name: "Diagramma pictum",
    local_name: "Kaci Mandi Abu",
    image:
      "/images/species/saltwater/new-28-10-25/Kaci Mandi Abu - Diagramma pictum.png",
  },
  {
    id: "tuskfish",
    english_name: "Tuskfish",
    local_name: "Ketarap",
    image: "/images/species/saltwater/new-28-10-25/Ketarap - Tuskfish.png",
  },
  {
    id: "scatophagus-argus",
    english_name: "Scatophagus argus",
    local_name: "Kitang",
    image:
      "/images/species/saltwater/new-28-10-25/Kitang - Scatophagus argus.png",
  },
  {
    id: "lethrinus-olivaceus",
    english_name: "Lethrinus Olivaceus",
    local_name: "Luping",
    image:
      "/images/species/saltwater/new-28-10-25/Luping - Lethrinus Olivaceus.png",
  },
  {
    id: "rainbow-runner",
    english_name: "Rainbow Runner",
    local_name: "Pepisang",
    image:
      "/images/species/saltwater/new-28-10-25/Pepisang - Rainbow Runner.png",
  },
  {
    id: "squirrelfish-snapper",
    english_name: "Squirrelfish Snapper",
    local_name: "Ruby Snapper",
    image:
      "/images/species/saltwater/new-28-10-25/Ruby Snapper - Squirrelfish Snapper.png",
  },
  {
    id: "longfin-trevally",
    english_name: "Longfin Trevally",
    local_name: "Sagai",
    image:
      "/images/species/saltwater/new-28-10-25/Sagai - Longfin Travelly.png",
  },
  {
    id: "scissortail-rasbora",
    english_name: "Scissortail Rasbora",
    local_name: "Seluang Gajah",
    image:
      "/images/species/saltwater/new-28-10-25/Seluang Gajah -  Scissortail Rasbora.png",
  },
  {
    id: "terubuk",
    english_name: "Toli Shad",
    local_name: "Terubuk",
    image: "/images/species/saltwater/new-28-10-25/Terubuk - Toli Shad.png",
  },
  {
    id: "largehead-hairtail",
    english_name: "Largehead Hairtail",
    local_name: "Timah",
    image:
      "/images/species/saltwater/new-28-10-25/Timah - Largehead Hairtail.png",
  },
].map((s) => ({ ...s, category: SPECIES_CATEGORIES.SALTWATER }));

// --- Freshwater Species ---
const FRESH_WATER_SPECIES = [
  {
    id: "aligator-gar",
    english_name: "Aligator Gar",
    local_name: "Ikan Buaya",
    image: "/images/species/freshwater/1. Alligator Gar.png",
  },
  {
    id: "giant-snakehead",
    english_name: "Giant Snakehead",
    local_name: "Toman",
    image: "/images/species/freshwater/2. Giant Snakehead.png",
  },
  {
    id: "channa-striata",
    english_name: "Channa Striata",
    local_name: "Haruan",
    image: "/images/species/freshwater/3. Channa Striata.png",
  },
  {
    id: "climbing-perch",
    english_name: "Climbing Perch",
    local_name: "Puyu",
    image: "/images/species/freshwater/4. Climbing Perch.png",
  },
  {
    id: "giant-freshwater-prawn",
    english_name: "Giant Freshwater Prawn",
    local_name: "Udang Galah",
    image: "/images/species/freshwater/5. Giant Freshwater Prawn.png",
  },
  {
    id: "peacock-bass",
    english_name: "Peacock Bass",
    local_name: "Ikan Raja",
    image: "/images/species/freshwater/6. Peacock Bass.png",
  },
  {
    id: "arapaimas",
    english_name: "Arapaimas",
    local_name: "Arapaima",
    image: "/images/species/freshwater/7. Arapaima.png",
  },
  {
    id: "channa-maru",
    english_name: "Channa Maru",
    local_name: "Kerandang",
    image: "/images/species/freshwater/8. Channa Maru.png",
  },
  {
    id: "temensis",
    english_name: "Temensis",
    local_name: "Ikan Temensis",
    image: "/images/species/freshwater/9. Temensis.png",
  },
  {
    id: "mayan-cichlid",
    english_name: "Mayan Cichlid",
    local_name: "Ikan Mayan",
    image: "/images/species/freshwater/10. Mayan Cichlids.png",
  },
  {
    id: "gourami",
    english_name: "Gourami",
    local_name: "Kaloi",
    image: "/images/species/freshwater/11. Gourami Kaloi.png",
  },
  {
    id: "tinfoil-barb",
    english_name: "Tinfoil Barb",
    local_name: "Lampam",
    image: "/images/species/freshwater/12. Tinfoil Barb Lampam.png",
  },
  {
    id: "hampala",
    english_name: "Hampala",
    local_name: "Sebarau",
    image: "/images/species/freshwater/13. Hampala Sebarau.png",
  },
  {
    id: "sharkcatfish",
    english_name: "Sharkcatfish",
    local_name: "Patin",
    image: "/images/species/freshwater/14. Patin Sharkcatfish.png",
  },
  {
    id: "chao-praya-catfish",
    english_name: "Chao Praya Catfish",
    local_name: "Chao Phraya",
    image: "/images/species/freshwater/15. Chao Phraya.png",
  },
  {
    id: "mekong-giant-catfish",
    english_name: "Mekong Giant Catfish",
    local_name: "Mekong",
    image: "/images/species/freshwater/16. Mekong Giant Catfish.png",
  },
  {
    id: "redtail-catfish",
    english_name: "Redtail Catfish",
    local_name: "Baung Ekor Merah",
    image: "/images/species/freshwater/17. Redtail Catfish.png",
  },
  {
    id: "jaguar-cichlid",
    english_name: "Jaguar Cichlid",
    local_name: "Jaguar",
    image: "/images/species/freshwater/18. Jaguar Cichlid.png",
  },
  {
    id: "mahseer",
    english_name: "Mahseer",
    local_name: "Tengas",
    image: "/images/species/freshwater/19. Tengas Mahseer.png",
  },
  {
    id: "putitor-mahseer",
    english_name: "Putitor Mahseer",
    local_name: "Kelah",
    image: "/images/species/freshwater/20. Kelah Putitor Mahseer.png",
  },
  {
    id: "rohu",
    english_name: "Rohu",
    local_name: "Rohu",
    image: "/images/species/freshwater/21. Rohu.png",
  },
  {
    id: "catfish",
    english_name: "Catfish",
    local_name: "Keli",
    image: "/images/species/freshwater/22. Keli Catfish.png",
  },
  {
    id: "blue-tilapia",
    english_name: "Blue Tilapia",
    local_name: "Tilapia",
    image: "/images/species/freshwater/23. Blue Tilapia.png",
  },
  {
    id: "red-tilapia",
    english_name: "Red Tilapia",
    local_name: "Tilapia",
    image: "/images/species/freshwater/24. Red Tilapia.png",
  },
  {
    id: "arowana",
    english_name: "Arowana",
    local_name: "Arowana",
    image: "/images/species/freshwater/25. Arowana.png",
  },
  {
    id: "pacu",
    english_name: "Pacu",
    local_name: "Pacu",
    image: "/images/species/freshwater/26. Pacu.png",
  },
  {
    id: "hemibagrus",
    english_name: "Hemibagrus",
    local_name: "Baung",
    image: "/images/species/freshwater/27. Baung Hemibagrus.png",
  },
  {
    id: "forest-channa",
    english_name: "Forest Channa",
    local_name: "Bujuk",
    image: "/images/species/freshwater/28. Bujuk Forest Channa.png",
  },
  {
    id: "tengalan",
    english_name: "Tengalan",
    local_name: "Tengalan",
    image: "/images/species/freshwater/29. Tengalan.png",
  },
  {
    id: "jelawat",
    english_name: "Jelawat",
    local_name: "Jelawat",
    image: "/images/species/freshwater/30. Jelawat.png",
  },
  {
    id: "wallago-attu",
    english_name: "Wallago Attu",
    local_name: "Tapah",
    image: "/images/species/freshwater/31. Tapah Wallago Attu.png",
  },
  {
    id: "knifefish",
    english_name: "Knifefish",
    local_name: "Belida",
    image: "/images/species/freshwater/32. Belida Knifefish.png",
  },
  {
    id: "bighead-carp",
    english_name: "Bighead Carp",
    local_name: "Tongsan",
    image: "/images/species/freshwater/33. Tongsan Bighead Carp.png",
  },
  {
    id: "sucker-barb",
    english_name: "Sucker Barb",
    local_name: "Bentulu",
    image: "/images/species/freshwater/Bentulu - Sucker Barb.png",
  },
  {
    id: "mystacoleus",
    english_name: "Mystacoleus",
    local_name: "Ikan Masai",
    image:
      "/images/species/freshwater/Ikan Masai -  Mystacoleucus marginatus.png",
  },
  {
    id: "king-of-terbul",
    english_name: "King of Terbul",
    local_name: "Kelabau",
    image: "/images/species/freshwater/Kelabau - King of Terbul.png",
  },
  {
    id: "goonch-catfish",
    english_name: "Goonch Catfish",
    local_name: "Kenerak",
    image: "/images/species/freshwater/Kenerak - Goonch Catfish.png",
  },
  {
    id: "freshwater-dorab",
    english_name: "Freshwater Dorab",
    local_name: "Parang Sungai",
    image: "/images/species/freshwater/Parang Sungai - Fresh Water Dorab.png",
  },
  {
    id: "malayan-trout",
    english_name: "Malayan Trout",
    local_name: "Sikang",
    image: "/images/species/freshwater/Sikang - Malayan Trout.png",
  },
  {
    id: "temelian",
    english_name: "Temelian",
    local_name: "Temoleh",
    image: "/images/species/freshwater/Temoleh - Temelian.png",
  },
  {
    id: "beardless-barb",
    english_name: "Beardless Barb",
    local_name: "Temperas",
    image: "/images/species/freshwater/Temperas - Beardless Barb.png",
  },
].map((s) => ({ ...s, category: SPECIES_CATEGORIES.FRESHWATER }));

// --- Squid Species ---
const SQUID_SPECIES = [
  {
    id: "octopus",
    english_name: "Octopus",
    local_name: "Kurita",
    image: "/images/species/squid/Kurita (Octopus).png",
  },
  {
    id: "bigfin-reef-squid",
    english_name: "Bigfin Reef Squid",
    local_name: "Mabang",
    image: "/images/species/squid/Mabang (Bigfin Reef Squid).png",
  },
  {
    id: "needle-squid",
    english_name: "Needle Squid",
    local_name: "Sotong Jarum",
    image: "/images/species/squid/Sotong Jarum (NeedleSquid).png",
  },
  {
    id: "cuttlefish",
    english_name: "Cuttlefish",
    local_name: "Sotong Katak",
    image: "/images/species/squid/Sotong Katak (Cuttlefish).png",
  },
  {
    id: "squid",
    english_name: "Squid",
    local_name: "Sotong Ketupat",
    image: "/images/species/squid/Sotong Ketupat (Squid).png",
  },
  {
    id: "squid2",
    english_name: "Squid",
    local_name: "Sotong Torak",
    image: "/images/species/squid/Sotong Torak (Squid).png",
  },
].map((s) => ({ ...s, category: SPECIES_CATEGORIES.SQUID }));

export const ALL_SPECIES: SpeciesItem[] = [
  ...SALTWATER_SPECIES,
  ...FRESH_WATER_SPECIES,
  ...SQUID_SPECIES,
];

export const SPECIES_BY_ID: Record<string, SpeciesItem> = ALL_SPECIES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, SpeciesItem>
);

export const SPECIES_BY_CATEGORY: Record<SpeciesCategory, SpeciesItem[]> = {
  [SPECIES_CATEGORIES.SALTWATER]: SALTWATER_SPECIES,
  [SPECIES_CATEGORIES.FRESHWATER]: FRESH_WATER_SPECIES,
  [SPECIES_CATEGORIES.SQUID]: SQUID_SPECIES,
};

export type SpeciesId = keyof typeof SPECIES_BY_ID;

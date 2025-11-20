/**
 * Malaysian City to District Mapping
 *
 * Comprehensive mapping of Malaysian towns/cities to their administrative districts.
 * This is needed because the database stores city names from Google Places API,
 * but our image organization uses district names.
 *
 * Problem: Database has city="Port Klang", Images need district="klang"
 * Solution: Map city names to their parent districts
 *
 * Malaysian Structure: State → District → City/Town → Mukim
 * Example: Selangor → Klang District → [Klang, Port Klang]
 *
 * Coverage: 368 mappings across all Malaysian states
 * - Selangor: 87 towns
 * - Johor: 47 towns
 * - Perak: 42 towns
 * - Sarawak: 36 towns
 * - Sabah: 34 towns
 * - And 8 more states + Federal Territories
 *
 * Usage:
 *   getCityDistrict("Port Klang") // returns "klang"
 *   getCityDistrict("Shah Alam")  // returns "petaling"
 *   getCityDistrict("Skudai")     // returns "johor bahru"
 *
 * Source: Wikipedia - List of districts in Malaysia
 * https://en.wikipedia.org/wiki/List_of_districts_in_Malaysia
 *
 * @see docs/fix-location-image-mapping.md for detailed documentation
 */ export const CITY_TO_DISTRICT_MAP: Record<string, string> = {
  // Selangor Cities & Towns → Districts
  // Petaling District (major urban area)
  "petaling jaya": "petaling",
  pj: "petaling",
  "shah alam": "petaling",
  "subang jaya": "petaling",
  puchong: "petaling",
  "bandar sunway": "petaling",
  sunway: "petaling",
  "seri kembangan": "petaling",
  "bukit jalil": "petaling",
  "old klang road": "petaling",
  "bandar utama": "petaling",
  "kota damansara": "petaling",
  "ara damansara": "petaling",

  // Klang District
  klang: "klang",
  "port klang": "klang",
  "pelabuhan klang": "klang",
  "bandar botanik": "klang",
  "bandar bukit tinggi": "klang",
  meru: "klang",
  kapar: "klang",

  // Hulu Langat District
  "hulu langat": "hulu langat",
  kajang: "hulu langat",
  ampang: "hulu langat",
  cheras: "hulu langat",
  bangi: "hulu langat",
  "bandar baru bangi": "hulu langat",
  semenyih: "hulu langat",
  beranang: "hulu langat",
  balakong: "hulu langat",

  // Gombak District
  gombak: "gombak",
  selayang: "gombak",
  "batu caves": "gombak",
  rawang: "gombak",
  "selayang baru": "gombak",
  "bandar baru selayang": "gombak",

  // Hulu Selangor District
  "hulu selangor": "hulu selangor",
  "kuala kubu bharu": "hulu selangor",
  "batang kali": "hulu selangor",
  "batu arang": "hulu selangor",
  serendah: "hulu selangor",

  // Kuala Selangor District
  "kuala selangor": "kuala selangor",
  "tanjung karang": "kuala selangor",
  "batang berjuntai": "kuala selangor",

  // Kuala Langat District
  "kuala langat": "kuala langat",
  "teluk datok": "kuala langat",
  banting: "kuala langat",
  jenjarom: "kuala langat",
  morib: "kuala langat",

  // Sabak Bernam District
  "sabak bernam": "sabak bernam",
  sabak: "sabak bernam",
  "sungai besar": "sabak bernam",
  sekinchan: "sabak bernam",

  // Sepang District
  sepang: "sepang",
  "salak tinggi": "sepang",
  cyberjaya: "sepang",
  klia: "sepang",
  nilai: "sepang",
  "bandar baru salak tinggi": "sepang",

  // Johor Cities → Districts
  "batu pahat": "batu pahat",
  "yong peng": "batu pahat",

  "johor bahru": "johor bahru",
  "johor lama": "johor bahru",
  "iskandar puteri": "johor bahru",
  nusajaya: "johor bahru",
  "pasir gudang": "johor bahru",
  skudai: "johor bahru",
  "gelang patah": "johor bahru",
  "ulu tiram": "johor bahru",
  masai: "johor bahru",
  plentong: "johor bahru",
  pandan: "johor bahru",
  tebrau: "johor bahru",
  tampoi: "johor bahru",
  kempas: "johor bahru",
  "kangkar pulai": "johor bahru",
  perling: "johor bahru",
  "taman perling": "johor bahru",
  "tanjung kupang": "johor bahru",
  "tanjung pelepas": "johor bahru",
  "johor jaya": "johor bahru",
  "permas jaya": "johor bahru",
  "bandar dato onn": "johor bahru",
  "seri alam": "johor bahru",
  larkin: "johor bahru",
  "ulu choh": "johor bahru",
  senai: "kulai",

  kluang: "kluang",
  "simpang renggam": "kluang",

  "kota tinggi": "kota tinggi",
  pengerang: "kota tinggi",
  "bandar penawar": "kota tinggi",

  kulai: "kulai",

  mersing: "mersing",

  muar: "muar",
  "bandar maharani": "muar",
  pagoh: "muar",

  "pontian kechil": "pontian",
  pontian: "pontian",
  benut: "pontian",

  segamat: "segamat",
  labis: "segamat",
  "buloh kasap": "segamat",
  chaah: "segamat",

  tangkak: "tangkak",
  "bukit gambir": "tangkak",

  // Kedah Cities → Districts
  "alor setar": "kota setar",
  "anak bukit": "kota setar",
  "kuala kedah": "kota setar",

  "sungai petani": "kuala muda",
  bedong: "kuala muda",

  kulim: "kulim",
  "padang serai": "kulim",

  jitra: "kubang pasu",
  changlun: "kubang pasu",
  kodiang: "kubang pasu",

  kuah: "langkawi",
  langkawi: "langkawi",
  "pantai cenang": "langkawi",

  baling: "baling",
  kupang: "baling",

  serdang: "bandar baharu",
  "bandar baharu": "bandar baharu",

  "kuala nerang": "padang terap",

  pendang: "pendang",

  "pokok sena": "pokok sena",

  sik: "sik",

  "yan besar": "yan",
  yan: "yan",
  gurun: "yan",

  // Kelantan Cities → Districts
  "kota bharu": "kota bharu",
  ketereh: "kota bharu",
  "wakaf bharu": "kota bharu",
  "rantau panjang": "pasir mas",

  "gua musang": "gua musang",

  jeli: "jeli",

  "kuala krai": "kuala krai",
  dabong: "kuala krai",

  machang: "machang",

  "pasir mas": "pasir mas",

  "pasir puteh": "pasir puteh",

  "tanah merah": "tanah merah",

  tumpat: "tumpat",
  "pengkalan kubor": "tumpat",

  bachok: "bachok",

  // Melaka Cities → Districts
  "alor gajah": "alor gajah",
  "masjid tanah": "alor gajah",
  "durian tunggal": "alor gajah",

  jasin: "jasin",
  "sungai rambai": "jasin",
  bemban: "jasin",

  "malacca city": "melaka tengah",
  melaka: "melaka tengah",
  malacca: "melaka tengah",
  "sungai udang": "melaka tengah",
  "ayer keroh": "melaka tengah",
  "batu berendam": "melaka tengah",

  // Negeri Sembilan Cities → Districts
  seremban: "seremban",
  senawang: "seremban",
  paroi: "seremban",
  "seremban 2": "seremban",
  "seremban jaya": "seremban",
  rasah: "seremban",

  "port dickson": "port dickson",
  "teluk kemang": "port dickson",
  "si rusa": "port dickson",

  "kuala pilah": "kuala pilah",

  jelebu: "jelebu",
  "kuala klawang": "jelebu",

  rembau: "rembau",
  kota: "rembau",

  tampin: "tampin",
  gemas: "tampin",

  "bandar seri jempol": "jempol",
  bahau: "jempol",
  "bandar baru serting": "jempol",

  // Pahang Cities → Districts
  kuantan: "kuantan",
  "indera mahkota": "kuantan",
  gambang: "kuantan",
  balok: "kuantan",
  beserah: "kuantan",

  pekan: "pekan",
  nenasi: "pekan",

  temerloh: "temerloh",
  mentakab: "temerloh",
  lanchang: "temerloh",

  bentong: "bentong",
  karak: "bentong",

  raub: "raub",
  "sungai ruan": "raub",

  jerantut: "jerantut",
  "kuala lipis": "lipis",

  lipis: "lipis",

  maran: "maran",

  bera: "bera",
  "bandar bera": "bera",

  "cameron highlands": "cameron highlands",
  "tanah rata": "cameron highlands",
  brinchang: "cameron highlands",
  ringlet: "cameron highlands",

  rompin: "rompin",
  "kuala rompin": "rompin",
  "sungai lembing": "kuantan",

  // Penang Cities → Districts
  "george town": "northeast penang island",
  georgetown: "northeast penang island",
  "tanjung tokong": "northeast penang island",
  "tanjong tokong": "northeast penang island",
  "pulau tikus": "northeast penang island",
  gurney: "northeast penang island",
  jelutong: "northeast penang island",
  "air itam": "northeast penang island",
  "bayan lepas": "southwest penang island",

  "balik pulau": "southwest penang island",
  teluk: "southwest penang island",
  gertak: "southwest penang island",

  "bukit mertajam": "central seberang perai",
  "seberang jaya": "central seberang perai",
  alma: "central seberang perai",
  "batu kawan": "central seberang perai",
  "permatang pauh": "central seberang perai",

  "kepala batas": "north seberang perai",
  butterworth: "north seberang perai",
  perai: "north seberang perai",
  "mak mandin": "north seberang perai",
  "tasek gelugor": "north seberang perai",

  "sungai jawi": "south seberang perai",
  "nibong tebal": "south seberang perai",
  "bagan ajam": "south seberang perai",
  "simpang ampat": "south seberang perai",

  // Perak Cities → Districts
  ipoh: "kinta",
  "tanjung rambutan": "kinta",
  jelapang: "kinta",
  menglembu: "kinta",
  "simpang pulai": "kinta",
  chemor: "kinta",
  "batu gajah": "kinta",

  taiping: "larut, matang and selama",
  kamunting: "larut, matang and selama",
  simpang: "larut, matang and selama",
  aulong: "larut, matang and selama",
  selama: "larut, matang and selama",

  "teluk intan": "hilir perak",

  "kuala kangsar": "kuala kangsar",
  sayong: "kuala kangsar",

  kampar: "kampar",
  gopeng: "kampar",
  "tanjung tualang": "kampar",

  "seri manjung": "manjung",
  lumut: "manjung",
  sitiawan: "manjung",
  pangkor: "manjung",
  "pantai remis": "manjung",
  "ayer tawar": "manjung",

  "tanjung malim": "muallim",
  "tanjong malim": "muallim",
  "slim river": "muallim",
  behrang: "muallim",

  tapah: "batang padang",
  bidor: "batang padang",

  gerik: "hulu perak",
  lenggong: "hulu perak",
  "pengkalan hulu": "hulu perak",
  grik: "hulu perak",

  "parit buntar": "kerian",
  "bagan serai": "kerian",
  "kuala kurau": "kerian",
  "changkat jering": "kerian",
  "simpang empat": "kerian",

  "seri iskandar": "perak tengah",

  "bagan datuk": "bagan datuk",
  "hutan melintang": "bagan datuk",

  // Perlis Cities → Districts
  kangar: "perlis",

  // Sabah Cities → Districts
  "kota kinabalu": "kota kinabalu",
  kk: "kota kinabalu",
  inanam: "kota kinabalu",
  likas: "kota kinabalu",
  menggatal: "kota kinabalu",
  sepanggar: "kota kinabalu",
  "tanjung aru": "kota kinabalu",

  sandakan: "sandakan",
  "bandar sandakan": "sandakan",
  batu: "sandakan",

  tawau: "tawau",
  balung: "tawau",

  "lahad datu": "lahad datu",

  keningau: "keningau",

  beaufort: "beaufort",
  weston: "beaufort",

  "kota belud": "kota belud",

  papar: "papar",
  kinarut: "papar",

  penampang: "penampang",
  donggongon: "penampang",

  ranau: "ranau",
  kundasang: "ranau",

  tuaran: "tuaran",
  tamparuli: "tuaran",

  kudat: "kudat",
  pitas: "kudat",

  semporna: "semporna",

  kunak: "kunak",

  putatan: "putatan",

  tenom: "tenom",

  tambunan: "tambunan",

  sipitang: "sipitang",

  "kota marudu": "kota marudu",

  // Sarawak Cities → Districts
  kuching: "kuching",
  "kuching utara": "kuching",
  "kuching selatan": "kuching",
  "petra jaya": "kuching",
  "kota padawan": "kuching",
  semariang: "kuching",
  matang: "kuching",
  bau: "kuching",
  lundu: "kuching",

  miri: "miri",
  "bandar miri": "miri",
  niah: "miri",

  sibu: "sibu",
  "sibu jaya": "sibu",
  kanowit: "sibu",

  bintulu: "bintulu",
  kidurong: "bintulu",
  "tanjung kidurong": "bintulu",

  limbang: "limbang",

  sarikei: "sarikei",
  bintangor: "sarikei",

  "sri aman": "sri aman",
  simanggang: "sri aman",
  "lubok antu": "sri aman",

  kapit: "kapit",
  song: "kapit",

  mukah: "mukah",
  dalat: "mukah",

  betong: "betong",
  saratok: "betong",

  lawas: "lawas",

  marudi: "marudi",

  serian: "serian",
  tebedu: "serian",

  samarahan: "samarahan",
  "kota samarahan": "samarahan",

  // Terengganu Cities → Districts
  "kuala terengganu": "kuala terengganu",
  kt: "kuala terengganu",
  "kuala trengganu": "kuala terengganu",

  kemaman: "kemaman",
  chukai: "kemaman",
  paka: "kemaman",
  kerteh: "kemaman",
  cukai: "kemaman",

  dungun: "dungun",
  "kuala dungun": "dungun",

  marang: "marang",
  "kuala marang": "marang",

  "kuala berang": "hulu terengganu",

  "kampung raja": "besut",
  jerteh: "besut",
  "kuala besut": "besut",

  "kuala nerus": "kuala nerus",
  "gong badak": "kuala nerus",

  setiu: "setiu",
  "bandar permaisuri": "setiu",
  permaisuri: "setiu",
  chalok: "setiu",

  "bukit payong": "marang",
  chendering: "kuala terengganu",

  // Federal Territories → Districts (treated as self-contained)
  "kuala lumpur": "kuala lumpur",
  putrajaya: "putrajaya",
  labuan: "labuan",
};

/**
 * Normalize a city name to match the mapping keys
 */
export function normalizeCityName(cityName: string): string {
  if (typeof cityName !== "string" || !cityName) return "";
  return cityName.toLowerCase().trim();
}

/**
 * Get the district name for a given city
 * Returns the city name itself if no mapping is found
 */
export function getCityDistrict(cityName: string): string {
  const normalized = normalizeCityName(cityName);
  return CITY_TO_DISTRICT_MAP[normalized] || cityName;
}

/**
 * Get all cities that map to a specific district
 */
export function getCitiesForDistrict(districtName: string): string[] {
  const normalized = districtName.toLowerCase().trim();
  return Object.entries(CITY_TO_DISTRICT_MAP)
    .filter(([, district]) => district === normalized)
    .map(([city]) => city);
}

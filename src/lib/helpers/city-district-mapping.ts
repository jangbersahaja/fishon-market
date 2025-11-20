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
 * Coverage: 600+ mappings across all Malaysian states and federal territories
 * Comprehensive mapping of major cities, towns, and localities from:
 * - Selangor: 100+ localities (Petaling, Klang, Hulu Langat, etc.)
 * - Johor: 90+ localities (Johor Bahru, Batu Pahat, Kluang, etc.)
 * - Perak: 65+ localities (Kinta/Ipoh, Larut/Taiping, Manjung, etc.)
 * - Penang: 45+ localities (George Town, Seberang Perai, etc.)
 * - Sarawak: 75+ localities (Kuching, Miri, Sibu, Bintulu, etc.)
 * - Sabah: 85+ localities (Kota Kinabalu, Sandakan, Tawau, etc.)
 * - Kedah: 40+ localities (Alor Setar, Sungai Petani, Langkawi, etc.)
 * - Pahang: 45+ localities (Kuantan, Temerloh, Cameron Highlands, etc.)
 * - Kelantan: 30+ localities (Kota Bharu, Pasir Mas, Gua Musang, etc.)
 * - Terengganu: 35+ localities (Kuala Terengganu, Kemaman, Dungun, etc.)
 * - Negeri Sembilan: 30+ localities (Seremban, Port Dickson, etc.)
 * - Melaka: 20+ localities (Melaka Tengah, Alor Gajah, Jasin, etc.)
 * - Perlis: 10+ localities (Kangar, Arau, Kuala Perlis, etc.)
 * - Federal Territories: 25+ localities (KL, Putrajaya, Labuan)
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
  "usj": "petaling",
  "subang": "petaling",
  "ss2": "petaling",
  "kelana jaya": "petaling",
  "damansara": "petaling",
  "damansara utama": "petaling",
  "damansara jaya": "petaling",
  "taman tun dr ismail": "petaling",
  "ttdi": "petaling",
  "sri hartamas": "petaling",
  "mont kiara": "petaling",
  "dutamas": "petaling",
  "segambut": "petaling",
  "kepong": "petaling",
  "taman megah": "petaling",
  "taman bahagia": "petaling",
  "lembah pantai": "petaling",
  "bangsar": "petaling",
  "bangsar south": "petaling",
  "pantai dalam": "petaling",
  "pudu": "petaling",
  "sungai besi": "petaling",
  "salak selatan": "petaling",
  "kinrara": "petaling",
  "bandar kinrara": "petaling",
  "uep subang jaya": "petaling",
  "sunway damansara": "petaling",
  "bandar sri damansara": "petaling",
  "kota kemuning": "petaling",
  "bukit tinggi": "petaling",
  "glenmarie": "petaling",
  "saujana": "petaling",
  "hicom": "petaling",

  // Klang District
  klang: "klang",
  "port klang": "klang",
  "pelabuhan klang": "klang",
  "bandar botanik": "klang",
  "bandar bukit tinggi": "klang",
  meru: "klang",
  kapar: "klang",
  "teluk pulai": "klang",
  "bandar puteri": "klang",
  "bukit raja": "klang",
  "taman sentosa": "klang",
  "pandamaran": "klang",
  "batu belah": "klang",
  "jalan kapar": "klang",
  "taman sentosa klang": "klang",

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
  "sungai long": "hulu langat",
  "taman connaught": "hulu langat",
  "taman maluri": "hulu langat",
  "taman midah": "hulu langat",
  "taman len seng": "hulu langat",
  "taman segar": "hulu langat",
  "bandar mahkota cheras": "hulu langat",
  "bandar tun hussein onn": "hulu langat",
  "bukit antarabangsa": "hulu langat",
  "ukay perdana": "hulu langat",
  "pandan indah": "hulu langat",
  "pandan jaya": "hulu langat",
  "taman shamelin": "hulu langat",
  "desa pandan": "hulu langat",
  "seri petaling": "hulu langat",
  "bukit serdang": "hulu langat",
  "taman sri serdang": "hulu langat",
  "broga": "hulu langat",
  "sungai tekali": "hulu langat",
  "dusun tua": "hulu langat",

  // Gombak District
  gombak: "gombak",
  selayang: "gombak",
  "batu caves": "gombak",
  rawang: "gombak",
  "selayang baru": "gombak",
  "bandar baru selayang": "gombak",
  "batu arang": "gombak",
  "taman melati": "gombak",
  setapak: "gombak",
  "wangsa maju": "gombak",
  "taman sri rampai": "gombak",
  "danau kota": "gombak",
  "sentul": "gombak",
  "hulu kelang": "gombak",
  "taman melawati": "gombak",
  "taman keramat": "gombak",
  "kuang": "gombak",
  "serendah": "gombak",

  // Hulu Selangor District
  "hulu selangor": "hulu selangor",
  "kuala kubu bharu": "hulu selangor",
  "kuala kubu baru": "hulu selangor",
  "batang kali": "hulu selangor",
  "rasa": "hulu selangor",
  "kalumpang": "hulu selangor",
  "kerling": "hulu selangor",
  "peretak": "hulu selangor",
  "ulu yam": "hulu selangor",

  // Kuala Selangor District
  "kuala selangor": "kuala selangor",
  "tanjung karang": "kuala selangor",
  "batang berjuntai": "kuala selangor",
  "ijok": "kuala selangor",
  "bestari jaya": "kuala selangor",
  "jeram": "kuala selangor",
  "pasir penambang": "kuala selangor",

  // Kuala Langat District
  "kuala langat": "kuala langat",
  "teluk datok": "kuala langat",
  banting: "kuala langat",
  jenjarom: "kuala langat",
  morib: "kuala langat",
  "kelanang": "kuala langat",
  "tanjung sepat": "kuala langat",
  "sijangkang": "kuala langat",
  "teluk panglima garang": "kuala langat",

  // Sabak Bernam District
  "sabak bernam": "sabak bernam",
  sabak: "sabak bernam",
  "sungai besar": "sabak bernam",
  sekinchan: "sabak bernam",
  "parit 1": "sabak bernam",
  "parit 2": "sabak bernam",
  "bagan terap": "sabak bernam",
  "sungai nibong": "sabak bernam",

  // Sepang District
  sepang: "sepang",
  "salak tinggi": "sepang",
  cyberjaya: "sepang",
  klia: "sepang",
  "klia2": "sepang",
  nilai: "sepang",
  "bandar baru salak tinggi": "sepang",
  "bandar baru nilai": "sepang",
  "labu": "sepang",
  "dengkil": "sepang",
  "salak": "sepang",

  // Johor Cities → Districts
  // Batu Pahat District
  "batu pahat": "batu pahat",
  "yong peng": "batu pahat",
  "senggarang": "batu pahat",
  "parit sulong": "batu pahat",
  "parit raja": "batu pahat",
  "seri medan": "batu pahat",
  "rengit": "batu pahat",
  "sri gading": "batu pahat",

  // Johor Bahru District
  "johor bahru": "johor bahru",
  "johor baharu": "johor bahru",
  jb: "johor bahru",
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
  "taman mount austin": "johor bahru",
  "mount austin": "johor bahru",
  "taman johor jaya": "johor bahru",
  "taman daya": "johor bahru",
  "taman sentosa johor": "johor bahru",
  "taman molek": "johor bahru",
  "taman sutera utama": "johor bahru",
  "stulang": "johor bahru",
  "danga bay": "johor bahru",
  "bukit indah": "johor bahru",
  "taman nusa bestari": "johor bahru",
  "taman universiti": "johor bahru",

  // Kluang District
  kluang: "kluang",
  "simpang renggam": "kluang",
  "ayer hitam": "kluang",
  "paloh": "kluang",
  "kahang": "kluang",
  "chamek": "kluang",

  // Kota Tinggi District
  "kota tinggi": "kota tinggi",
  pengerang: "kota tinggi",
  "bandar penawar": "kota tinggi",
  "desaru": "kota tinggi",
  "sedili": "kota tinggi",
  "sedili besar": "kota tinggi",
  "sedili kecil": "kota tinggi",
  "teluk ramunia": "kota tinggi",
  "teluk sengat": "kota tinggi",

  // Kulai District
  kulai: "kulai",
  senai: "kulai",
  "kulai besar": "kulai",
  "saleng": "kulai",
  "sedenak": "kulai",
  "bandar putra": "kulai",

  // Mersing District
  mersing: "mersing",
  "air papan": "mersing",
  "endau": "mersing",
  "jemaluang": "mersing",

  // Muar District
  muar: "muar",
  "bandar maharani": "muar",
  pagoh: "muar",
  "bukit pasir": "muar",
  "sungai balang": "muar",
  "parit jawa": "muar",
  "lenga": "muar",
  "bakri": "muar",

  // Pontian District
  "pontian kechil": "pontian",
  pontian: "pontian",
  benut: "pontian",
  "pekan nenas": "pontian",
  "ayer baloi": "pontian",
  "sungai layau": "pontian",
  "kukup": "pontian",

  // Segamat District
  segamat: "segamat",
  labis: "segamat",
  "buloh kasap": "segamat",
  chaah: "segamat",
  "jementah": "segamat",
  "bekok": "segamat",
  "genuang": "segamat",

  // Tangkak District
  tangkak: "tangkak",
  "bukit gambir": "tangkak",
  "sungai mati": "tangkak",
  "sagil": "tangkak",

  // Kedah Cities → Districts
  // Kota Setar District
  "alor setar": "kota setar",
  "alor star": "kota setar",
  "anak bukit": "kota setar",
  "kuala kedah": "kota setar",
  "simpang kuala": "kota setar",
  "pokok sena kedah": "kota setar",

  // Kuala Muda District
  "sungai petani": "kuala muda",
  bedong: "kuala muda",
  "sungai lalang": "kuala muda",
  "mergong": "kuala muda",
  "tikam batu": "kuala muda",
  "gurun": "kuala muda",
  "semeling": "kuala muda",

  // Kulim District
  kulim: "kulim",
  "padang serai": "kulim",
  "lunas": "kulim",
  "karangan": "kulim",

  // Kubang Pasu District
  jitra: "kubang pasu",
  changlun: "kubang pasu",
  kodiang: "kubang pasu",
  "bukit kayu hitam": "kubang pasu",
  "kepala batas kedah": "kubang pasu",
  "naka": "kubang pasu",
  "darulaman": "kubang pasu",

  // Langkawi District
  kuah: "langkawi",
  langkawi: "langkawi",
  "pantai cenang": "langkawi",
  "pantai tengah": "langkawi",
  "padang matsirat": "langkawi",
  "ulu melaka": "langkawi",

  // Baling District
  baling: "baling",
  kupang: "baling",
  "kuala pegang": "baling",

  // Bandar Baharu District
  "serdang kedah": "bandar baharu",
  "bandar baharu": "bandar baharu",

  // Padang Terap District
  "kuala nerang": "padang terap",
  "padang terap": "padang terap",

  // Pendang District
  pendang: "pendang",
  "guar sanji": "pendang",
  "tokai": "pendang",

  // Sik District
  sik: "sik",
  "kota kuala muda": "sik",

  // Yan District
  "yan besar": "yan",
  yan: "yan",
  "guar chempedak": "yan",

  // Kelantan Cities → Districts
  // Kota Bharu District
  "kota bharu": "kota bharu",
  "kota bahru": "kota bharu",
  kb: "kota bharu",
  ketereh: "kota bharu",
  "wakaf bharu": "kota bharu",
  "kubang kerian": "kota bharu",
  "tok hakim": "kota bharu",
  "pengkalan chepa": "kota bharu",
  "kota darulnaim": "kota bharu",

  // Pasir Mas District
  "pasir mas": "pasir mas",
  "rantau panjang": "pasir mas",
  "chetok": "pasir mas",
  "gual sitok": "pasir mas",

  // Gua Musang District
  "gua musang": "gua musang",
  "batu melintang": "gua musang",
  "pulai": "gua musang",

  // Jeli District
  jeli: "jeli",

  // Kuala Krai District
  "kuala krai": "kuala krai",
  dabong: "kuala krai",
  "manek urai": "kuala krai",

  // Machang District
  machang: "machang",
  "kampung laut": "machang",
  "temangan": "machang",

  // Pasir Puteh District
  "pasir puteh": "pasir puteh",
  "selising": "pasir puteh",
  "gaal": "pasir puteh",

  // Tanah Merah District
  "tanah merah": "tanah merah",
  "kusial": "tanah merah",
  "jedok": "tanah merah",

  // Tumpat District
  tumpat: "tumpat",
  "pengkalan kubor": "tumpat",
  "pasir pekan": "tumpat",

  // Bachok District
  bachok: "bachok",
  "perupok": "bachok",

  // Melaka Cities → Districts
  // Alor Gajah District
  "alor gajah": "alor gajah",
  "masjid tanah": "alor gajah",
  "durian tunggal": "alor gajah",
  "lubok china": "alor gajah",
  "taboh naning": "alor gajah",
  "pulau sebang": "alor gajah",

  // Jasin District
  jasin: "jasin",
  "sungai rambai": "jasin",
  bemban: "jasin",
  "merlimau": "jasin",
  "umbai": "jasin",
  "kesang": "jasin",
  "selandar": "jasin",

  // Melaka Tengah District
  "malacca city": "melaka tengah",
  melaka: "melaka tengah",
  malacca: "melaka tengah",
  "sungai udang": "melaka tengah",
  "ayer keroh": "melaka tengah",
  "batu berendam": "melaka tengah",
  "bukit beruang": "melaka tengah",
  "klebang": "melaka tengah",
  "tanjung kling": "melaka tengah",
  "ujong pasir": "melaka tengah",
  "bukit baru": "melaka tengah",
  "taman melaka raya": "melaka tengah",

  // Negeri Sembilan Cities → Districts
  // Seremban District
  seremban: "seremban",
  senawang: "seremban",
  paroi: "seremban",
  "seremban 2": "seremban",
  "seremban jaya": "seremban",
  rasah: "seremban",
  "nilai ns": "seremban",
  "labu ns": "seremban",
  "lobak": "seremban",
  "ampangan": "seremban",
  "rahang": "seremban",

  // Port Dickson District
  "port dickson": "port dickson",
  pd: "port dickson",
  "teluk kemang": "port dickson",
  "si rusa": "port dickson",
  "lukut": "port dickson",
  "pasir panjang": "port dickson",
  "blue lagoon": "port dickson",

  // Kuala Pilah District
  "kuala pilah": "kuala pilah",
  "senaling": "kuala pilah",
  "johol": "kuala pilah",
  "juasseh": "kuala pilah",

  // Jelebu District
  jelebu: "jelebu",
  "kuala klawang": "jelebu",
  "pertang": "jelebu",
  "titi": "jelebu",

  // Rembau District
  rembau: "rembau",
  "kota": "rembau",
  "kota rembau": "rembau",
  "chembong": "rembau",
  "ulu rembau": "rembau",

  // Tampin District
  tampin: "tampin",
  "gemas tampin": "tampin",
  "gemencheh": "tampin",
  "keru": "tampin",
  "air kuning": "tampin",

  // Jempol District
  "bandar seri jempol": "jempol",
  bahau: "jempol",
  "bandar baru serting": "jempol",
  "kuala jempol": "jempol",

  // Pahang Cities → Districts
  // Kuantan District
  kuantan: "kuantan",
  "indera mahkota": "kuantan",
  gambang: "kuantan",
  balok: "kuantan",
  beserah: "kuantan",
  "sungai lembing": "kuantan",
  "panching": "kuantan",
  "semambu": "kuantan",
  "tanjung lumpur": "kuantan",
  "after 18": "kuantan",
  "bukit galing": "kuantan",
  "bukit sekilau": "kuantan",

  // Pekan District
  pekan: "pekan",
  nenasi: "pekan",
  "kuala pahang": "pekan",
  "lepar": "pekan",
  "peramu": "pekan",

  // Temerloh District
  temerloh: "temerloh",
  mentakab: "temerloh",
  lanchang: "temerloh",
  "kuala krau": "temerloh",
  "kerdau": "temerloh",
  "triang": "temerloh",

  // Bentong District
  bentong: "bentong",
  karak: "bentong",
  "lurah bilut": "bentong",
  "sabai": "bentong",
  "pelangai": "bentong",

  // Raub District
  raub: "raub",
  "sungai ruan": "raub",
  "dong": "raub",
  "tras": "raub",
  "sungai koyan": "raub",
  "bukit fraser": "raub",

  // Jerantut District
  jerantut: "jerantut",
  "kuala tembeling": "jerantut",
  "damak": "jerantut",

  // Lipis District
  "kuala lipis": "lipis",
  lipis: "lipis",
  "benta": "lipis",
  "merapoh": "lipis",

  // Maran District
  maran: "maran",
  "chenor": "maran",
  "jengka": "maran",
  "bandar tun abdul razak": "maran",

  // Bera District
  bera: "bera",
  "bandar bera": "bera",
  "mengkuang": "bera",

  // Cameron Highlands District
  "cameron highlands": "cameron highlands",
  "tanah rata": "cameron highlands",
  brinchang: "cameron highlands",
  ringlet: "cameron highlands",
  "tringkap": "cameron highlands",
  "kampung raja cameron": "cameron highlands",

  // Rompin District
  rompin: "rompin",
  "kuala rompin": "rompin",
  "endau pahang": "rompin",
  "tioman": "rompin",
  "pulau tioman": "rompin",

  // Penang Cities → Districts
  // Northeast Penang Island District
  "george town": "northeast penang island",
  georgetown: "northeast penang island",
  "tanjung tokong": "northeast penang island",
  "tanjong tokong": "northeast penang island",
  "pulau tikus": "northeast penang island",
  gurney: "northeast penang island",
  jelutong: "northeast penang island",
  "air itam": "northeast penang island",
  "paya terubong": "northeast penang island",
  "relau": "northeast penang island",
  "sungai ara": "northeast penang island",
  "tanjung bungah": "northeast penang island",
  "tanjong bungah": "northeast penang island",
  "batu ferringhi": "northeast penang island",
  "teluk bahang": "northeast penang island",
  "farlim": "northeast penang island",
  "ayer itam": "northeast penang island",
  "komtar": "northeast penang island",
  "prangin": "northeast penang island",
  "lebuh chulia": "northeast penang island",

  // Southwest Penang Island District
  "bayan lepas": "southwest penang island",
  "balik pulau": "southwest penang island",
  "teluk kumbar": "southwest penang island",
  gertak: "southwest penang island",
  "bayan mutiara": "southwest penang island",
  "sungai nibong penang": "southwest penang island",
  "batu maung": "southwest penang island",

  // Central Seberang Perai District
  "bukit mertajam": "central seberang perai",
  "seberang jaya": "central seberang perai",
  alma: "central seberang perai",
  "batu kawan": "central seberang perai",
  "permatang pauh": "central seberang perai",
  "bukit tengah": "central seberang perai",
  "bukit minyak": "central seberang perai",
  "juru": "central seberang perai",
  "valdor": "central seberang perai",

  // North Seberang Perai District
  "kepala batas penang": "north seberang perai",
  butterworth: "north seberang perai",
  perai: "north seberang perai",
  "mak mandin": "north seberang perai",
  "tasek gelugor": "north seberang perai",
  "permatang tinggi": "north seberang perai",
  "bertam": "north seberang perai",
  "penaga": "north seberang perai",

  // South Seberang Perai District
  "sungai jawi": "south seberang perai",
  "nibong tebal": "south seberang perai",
  "bagan ajam": "south seberang perai",
  "simpang ampat penang": "south seberang perai",
  "permatang rawa": "south seberang perai",
  "sungai bakap": "south seberang perai",

  // Perak Cities → Districts
  // Kinta District
  ipoh: "kinta",
  "tanjung rambutan": "kinta",
  jelapang: "kinta",
  menglembu: "kinta",
  "simpang pulai": "kinta",
  chemor: "kinta",
  "batu gajah": "kinta",
  "lahat": "kinta",
  "pasir puteh perak": "kinta",
  "gunung rapat": "kinta",
  "tambun": "kinta",
  "sungai siput kinta": "kinta",
  "sungkai": "kinta",
  "pusing": "kinta",
  "tronoh": "kinta",

  // Larut, Matang and Selama District
  taiping: "larut, matang and selama",
  kamunting: "larut, matang and selama",
  simpang: "larut, matang and selama",
  aulong: "larut, matang and selama",
  selama: "larut, matang and selama",
  "bukit gantang": "larut, matang and selama",
  "kuala sepetang": "larut, matang and selama",
  "port weld": "larut, matang and selama",

  // Hilir Perak District
  "teluk intan": "hilir perak",
  "bagan datoh": "hilir perak",
  "kampung gajah": "hilir perak",
  "langkap": "hilir perak",

  // Kuala Kangsar District
  "kuala kangsar": "kuala kangsar",
  sayong: "kuala kangsar",
  "lasah": "kuala kangsar",
  "manong": "kuala kangsar",
  "chenderong balai": "kuala kangsar",

  // Kampar District
  kampar: "kampar",
  gopeng: "kampar",
  "tanjung tualang": "kampar",
  "malim nawar": "kampar",
  "sungai siput utara": "kampar",

  // Manjung District
  "seri manjung": "manjung",
  lumut: "manjung",
  sitiawan: "manjung",
  pangkor: "manjung",
  "pulau pangkor": "manjung",
  "pantai remis": "manjung",
  "ayer tawar": "manjung",
  "lekir": "manjung",
  "beruas": "manjung",
  "changkat keruing": "manjung",

  // Muallim District
  "tanjung malim": "muallim",
  "tanjong malim": "muallim",
  "slim river": "muallim",
  behrang: "muallim",
  "sungai behrang": "muallim",
  "proton city": "muallim",

  // Batang Padang District
  tapah: "batang padang",
  bidor: "batang padang",
  "chenderiang": "batang padang",

  // Hulu Perak District
  gerik: "hulu perak",
  lenggong: "hulu perak",
  "pengkalan hulu": "hulu perak",
  grik: "hulu perak",
  "kuala kenering": "hulu perak",
  "kerunai": "hulu perak",

  // Kerian District
  "parit buntar": "kerian",
  "bagan serai": "kerian",
  "kuala kurau": "kerian",
  "changkat jering": "kerian",
  "simpang empat": "kerian",
  "tanjong piandang": "kerian",
  "selinsing": "kerian",

  // Perak Tengah District
  "seri iskandar": "perak tengah",
  "parit": "perak tengah",
  "bota": "perak tengah",

  // Bagan Datuk District
  "bagan datuk": "bagan datuk",
  "hutan melintang": "bagan datuk",
  "rungkup": "bagan datuk",

  // Perlis Cities → Districts
  // Perlis (Single state-level administration)
  kangar: "perlis",
  "arau": "perlis",
  "kuala perlis": "perlis",
  "padang besar": "perlis",
  "simpang ampat perlis": "perlis",
  "beseri": "perlis",
  "kaki bukit": "perlis",
  "mata ayer": "perlis",
  "guar sanji perlis": "perlis",
  "sanglang": "perlis",

  // Sabah Cities → Districts
  // Kota Kinabalu District
  "kota kinabalu": "kota kinabalu",
  kk: "kota kinabalu",
  inanam: "kota kinabalu",
  likas: "kota kinabalu",
  menggatal: "kota kinabalu",
  sepanggar: "kota kinabalu",
  "tanjung aru": "kota kinabalu",
  "telipok": "kota kinabalu",
  "lok kawi": "kota kinabalu",
  "kepayan": "kota kinabalu",
  "kolombong": "kota kinabalu",

  // Sandakan District
  sandakan: "sandakan",
  "bandar sandakan": "sandakan",
  "batu sapi": "sandakan",
  "sim sim": "sandakan",
  "mile 4": "sandakan",
  "mile 6": "sandakan",
  "bandar kim fung": "sandakan",

  // Tawau District
  tawau: "tawau",
  balung: "tawau",
  "bandar tawau": "tawau",
  "tanjung batu": "tawau",
  "apas balung": "tawau",

  // Lahad Datu District
  "lahad datu": "lahad datu",
  "bandar lahad datu": "lahad datu",
  "silabukan": "lahad datu",
  "tungku": "lahad datu",

  // Keningau District
  keningau: "keningau",
  "apin apin": "keningau",

  // Beaufort District
  beaufort: "beaufort",
  weston: "beaufort",
  "kuala penyu": "beaufort",
  "membakut": "beaufort",

  // Kota Belud District
  "kota belud": "kota belud",
  "kota belud town": "kota belud",

  // Papar District
  papar: "papar",
  kinarut: "papar",
  "bongawan": "papar",
  "kimanis": "papar",

  // Penampang District
  penampang: "penampang",
  donggongon: "penampang",
  "bundusan": "penampang",
  "kapayan": "penampang",

  // Ranau District
  ranau: "ranau",
  kundasang: "ranau",
  "poring": "ranau",

  // Tuaran District
  tuaran: "tuaran",
  tamparuli: "tuaran",
  "kiulu": "tuaran",
  "tenghilan": "tuaran",

  // Kudat District
  kudat: "kudat",
  pitas: "kudat",
  "sikuati": "kudat",
  "matunggong": "kudat",

  // Semporna District
  semporna: "semporna",
  "bandar semporna": "semporna",
  "bum bum": "semporna",

  // Kunak District
  kunak: "kunak",
  "bandar kunak": "kunak",

  // Putatan District
  putatan: "putatan",
  "petagas": "putatan",

  // Tenom District
  tenom: "tenom",
  "kemabong": "tenom",
  "lagud seberang": "tenom",

  // Tambunan District
  tambunan: "tambunan",
  "sunsuron": "tambunan",

  // Sipitang District
  sipitang: "sipitang",
  "sindumin": "sipitang",
  "mesapol": "sipitang",

  // Kota Marudu District
  "kota marudu": "kota marudu",
  "bandau": "kota marudu",

  // Beluran District
  beluran: "beluran",
  "telupid": "beluran",

  // Tongod District
  tongod: "tongod",

  // Nabawan District
  nabawan: "nabawan",

  // Sarawak Cities → Districts
  // Kuching District
  kuching: "kuching",
  "kuching utara": "kuching",
  "kuching selatan": "kuching",
  "petra jaya": "kuching",
  "kota padawan": "kuching",
  semariang: "kuching",
  matang: "kuching",
  bau: "kuching",
  lundu: "kuching",
  "kota sentosa": "kuching",
  "pending": "kuching",
  "tabuan jaya": "kuching",
  "batu kawa": "kuching",
  "batu lintang": "kuching",
  "satok": "kuching",
  "stampin": "kuching",

  // Miri District
  miri: "miri",
  "bandar miri": "miri",
  niah: "miri",
  "lutong": "miri",
  "tusan": "miri",
  "senadin": "miri",
  "bekenu": "miri",

  // Sibu District
  sibu: "sibu",
  "sibu jaya": "sibu",
  kanowit: "sibu",
  "selangau": "sibu",
  "tanjung manis": "sibu",
  "durin": "sibu",

  // Bintulu District
  bintulu: "bintulu",
  kidurong: "bintulu",
  "tanjung kidurong": "bintulu",
  "kemena": "bintulu",
  "sebauh": "bintulu",
  "tatau": "bintulu",

  // Limbang District
  limbang: "limbang",
  "bandar limbang": "limbang",
  "nanga medamit": "limbang",

  // Sarikei District
  sarikei: "sarikei",
  bintangor: "sarikei",
  "pakan": "sarikei",
  "julau": "sarikei",
  "meradong": "sarikei",

  // Sri Aman District
  "sri aman": "sri aman",
  simanggang: "sri aman",
  "lubok antu": "sri aman",
  "pantu": "sri aman",
  "engkilili": "sri aman",

  // Kapit District
  kapit: "kapit",
  song: "kapit",
  "belaga": "kapit",
  "pelagus": "kapit",

  // Mukah District
  mukah: "mukah",
  dalat: "mukah",
  "balingian": "mukah",
  "daro": "mukah",

  // Betong District
  betong: "betong",
  saratok: "betong",
  "debak": "betong",
  "maludam": "betong",
  "pusa": "betong",

  // Lawas District
  lawas: "lawas",
  "bandar lawas": "lawas",
  "trusan": "lawas",

  // Marudi District
  marudi: "marudi",
  "bandar marudi": "marudi",

  // Serian District
  serian: "serian",
  tebedu: "serian",
  "tebakang": "serian",
  "balai ringin": "serian",

  // Samarahan District
  samarahan: "samarahan",
  "kota samarahan": "samarahan",
  "sebuyau": "samarahan",
  "simunjan": "samarahan",

  // Matu District
  matu: "matu",
  "oya": "matu",

  // Subis District
  subis: "subis",

  // Terengganu Cities → Districts
  // Kuala Terengganu District
  "kuala terengganu": "kuala terengganu",
  kt: "kuala terengganu",
  "kuala trengganu": "kuala terengganu",
  chendering: "kuala terengganu",
  "pulau duyong": "kuala terengganu",
  "ladang": "kuala terengganu",
  "cabang tiga": "kuala terengganu",
  "losong": "kuala terengganu",

  // Kemaman District
  kemaman: "kemaman",
  chukai: "kemaman",
  cukai: "kemaman",
  paka: "kemaman",
  kerteh: "kemaman",
  "air jernih": "kemaman",
  "kemasik": "kemaman",
  "teluk kalong": "kemaman",
  "kijal": "kemaman",

  // Dungun District
  dungun: "dungun",
  "kuala dungun": "dungun",
  "sura": "dungun",
  "kuala abang": "dungun",

  // Marang District
  marang: "marang",
  "kuala marang": "marang",
  "bukit payong": "marang",
  "merchang": "marang",
  "rusila": "marang",

  // Hulu Terengganu District
  "kuala berang": "hulu terengganu",
  "hulu terengganu": "hulu terengganu",
  "tasik kenyir": "hulu terengganu",
  "ajil": "hulu terengganu",

  // Besut District
  "kampung raja": "besut",
  jerteh: "besut",
  "kuala besut": "besut",
  "kampong raja": "besut",
  "besut": "besut",
  "padang luas": "besut",

  // Kuala Nerus District
  "kuala nerus": "kuala nerus",
  "gong badak": "kuala nerus",
  "seberang takir": "kuala nerus",
  "batu rakit": "kuala nerus",

  // Setiu District
  setiu: "setiu",
  "bandar permaisuri": "setiu",
  permaisuri: "setiu",
  chalok: "setiu",
  "kampung mangkok": "setiu",
  "penarik": "setiu",

  // Federal Territories → Districts (treated as self-contained)
  // Kuala Lumpur
  "kuala lumpur": "kuala lumpur",
  kl: "kuala lumpur",
  "bukit bintang": "kuala lumpur",
  "chow kit": "kuala lumpur",
  "jalan tar": "kuala lumpur",
  "klcc": "kuala lumpur",
  "kampung baru": "kuala lumpur",
  "sentul kl": "kuala lumpur",
  "titiwangsa": "kuala lumpur",
  "wangsa maju kl": "kuala lumpur",
  "brickfields": "kuala lumpur",
  "mid valley": "kuala lumpur",
  "bangsar kl": "kuala lumpur",
  "damansara heights": "kuala lumpur",
  "bukit jalil kl": "kuala lumpur",
  "sungai besi kl": "kuala lumpur",
  "salak selatan kl": "kuala lumpur",

  // Putrajaya
  putrajaya: "putrajaya",
  "precinct 1": "putrajaya",
  "precinct 2": "putrajaya",
  "precinct 8": "putrajaya",
  "precinct 16": "putrajaya",

  // Labuan
  labuan: "labuan",
  "victoria": "labuan",
  "bandar labuan": "labuan",
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

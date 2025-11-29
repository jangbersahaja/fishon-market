/**
 * Location image helpers for mapping destination names to landmark images
 */

/**
 * State name to folder mapping
 * Maps state names (as they appear in charter data) to folder names in /public/images/locations/
 */
const STATE_FOLDER_MAP: Record<string, string> = {
  johor: "johor",
  kedah: "kedah",
  kelantan: "kelantan",
  melaka: "melaka",
  "negeri sembilan": "negeri-sembilan",
  pahang: "pahang",
  perak: "perak",
  perlis: "perlis",
  "pulau pinang": "pulau-pinang",
  penang: "pulau-pinang",
  sabah: "sabah",
  sarawak: "sarawak",
  selangor: "selangor",
  terengganu: "terengganu",
  "wilayah persekutuan": "wilayah-persekutuan",
  "kuala lumpur": "wilayah-persekutuan",
  labuan: "wilayah-persekutuan",
  putrajaya: "wilayah-persekutuan",
};

/**
 * Location image mappings
 * Maps normalized destination names to their image filenames
 * Key format: "state-folder/normalized-destination-name"
 */
const LOCATION_IMAGES: Record<string, string> = {
  // Johor
  "johor/batu pahat": "batu-pahat.jpg",
  "johor/johor bahru": "Johor-Bharu.jpeg",
  "johor/jb": "Johor-Bharu.jpeg",
  "johor/johor lama": "johor-lama.jpg",
  "johor/kluang": "kluang.jpg",
  "johor/kota tinggi": "kota-tinggi.jpg",
  "johor/kulai": "kulai.jpg",
  "johor/pontian": "pontian.jpg",
  "johor/mersing": "mersing.webp",
  "johor/muar": "muar.jpg",
  "johor/segamat": "segamat.webp",
  "johor/tangkak": "tangkak.jpg",
  "johor/masai": "Masai.jpg",
  "johor/pasir gudang": "pasir-gudang.jpg",

  // Kedah
  "kedah/baling": "baling.jpg",
  "kedah/bandar baharu": "bandar baharu.jpeg",
  "kedah/kota setar": "kota setar.webp",
  "kedah/alor setar": "kota setar.webp",
  "kedah/kubang pasu": "kubang pasu.jpg",
  "kedah/kulim": "kulim.jpg",
  "kedah/langkawi": "langkawi.png",
  "kedah/pendang": "pendang.jpg",
  "kedah/sik": "ladang anggur sik.jpg",
  "kedah/yan": "yan.jpg",

  // Kelantan
  "kelantan/gua musang": "Gua_Musang_1.jpg",
  "kelantan/kuala krai": "Kuala-Krai-Mini-Zoo.jpg.webp",
  "kelantan/tanah merah": "Pasar-besar-tanah-merah.jpg",
  "kelantan/bachok": "bachok.jpg",
  "kelantan/kota bharu": "kota bharu .jpg",
  "kelantan/jeli": "lata kashmir jeli.jpg",
  "kelantan/pasir mas": "pasir-mas.jpeg",
  "kelantan/tumpat": "tumpat.webp",

  // Melaka
  "melaka/jasin": "Jasin_District_Hospital_main_building.JPG",
  "melaka/alor gajah": "alor-gajah-freeport-2.jpg",
  "melaka/melaka tengah": "melaka tengah.jpg.webp",
  "melaka/bandar melaka": "bandar-melaka.webp",
  "melaka/melaka": "bandar-melaka.webp",

  // Negeri Sembilan
  "negeri-sembilan/kuala pilah": "PekanKualaPilah.png",
  "negeri-sembilan/tampin": "Pekan_Tampin.jpg",
  "negeri-sembilan/jempol": "jempol.JPG",
  "negeri-sembilan/johol": "Johol.jpg",
  "negeri-sembilan/port dickson": "Port-Dickson.jpg",
  "negeri-sembilan/rembau": "rembau.jpg",
  "negeri-sembilan/seremban": "seremban.jpg",

  // Pahang
  "pahang/bera": "Bera.jpg",
  "pahang/bentong": "Bentong.jpg",
  "pahang/cameron highlands": "Cameron Highlands.jpg",
  "pahang/jerantut": "Jerantut.jpg",
  "pahang/kuantan": "Kuantan.jpg",
  "pahang/lipis": "Lipis.JPG",
  "pahang/maran": "Maran.jpg",
  "pahang/pekan": "Pekan.jpg",
  "pahang/raub": "Raub.jpg",
  "pahang/rompin": "Rompin.JPG",
  "pahang/temerloh": "Temerloh.jpg",

  // Perak
  "perak/bagan serai": "Bagan-Serai.jpg",
  "perak/batang padang": "Batang Padang.jpg",
  "perak/changkat keruing": "Changkat_Keruing.jpg",
  "perak/gerik": "Gerik.webp",
  "perak/hilir perak": "Hilir Perak.png",
  "perak/hulu perak": "Hulu Perak.jpg",
  "perak/kampar": "Kampar.jpg",
  "perak/kerian": "Kerian.jpg",
  "perak/kinta": "Kinta.jpg",
  "perak/ipoh": "Kinta.jpg",
  "perak/kuala kangsar": "Kuala Kangsar.jpg",
  "perak/lenggong": "Lenggong.jpg",
  "perak/lumut": "Lumut.jpg",
  "perak/manjung": "Manjung.jpg",
  "perak/muallim": "Muallim.jpg",
  "perak/sungai siput": "Sungai-Siput.jpg",
  "perak/taiping": "Taiping.jpg",

  // Perlis
  "perlis/kangar":
    "melati-lake-recreational-park-taman-rekreasi-tasik-melati-min.jpg",
  "perlis/arau": "bukit-kubu-amenity-forest-hutan-lipur-bukit-kubu-min.jpg",
  "perlis/padang besar": "timah-tasoh-lake-tasik-timah-tasoh-min.jpg",

  // Pulau Pinang
  "pulau-pinang/balik pulau": "balik pulau street art.jpg",
  "pulau-pinang/georgetown": "georgetown.jpg",
  "pulau-pinang/george town": "georgetown.jpg",
  "pulau-pinang/penang hill": "penang-hill-min georgetown.jpg",
  "pulau-pinang/seberang perai tengah": "seberang perai  tengah.jpg",
  "pulau-pinang/seberang perai utara": "seberang perai utara.png",
  "pulau-pinang/seberang perai": "seberang perai.jpg",
  "pulau-pinang/butterworth": "seberang perai.jpg",
  "pulau-pinang/jawi": "sps jawi.webp",

  // Sabah
  "sabah/lahad datu": "Lahad Datu.jpeg",
  "sabah/ranau": "Ranau.jpg",
  "sabah/beaufort":
    "Beaufort_Sabah_Green-orange-and-pineapple-roundabout-01.jpg",
  "sabah/beluran": "Beluran.jpg",
  "sabah/kalabakan": "Kalabakan.jpg",
  "sabah/keningau": "Keningau.jpg",
  "sabah/kinabatangan": "Kinabatangan.jpg",
  "sabah/kota belud": "Kota Belud.jpg",
  "sabah/kota marudu": "Kota Marudu.jpg",
  "sabah/kota kinabalu": "Kota-Kinabalu.jpg",
  "sabah/kuala penyu": "Kuala Penyu.jpeg",
  "sabah/kudat": "Kudat.jpg",
  "sabah/kunak": "Kunak.jpg",
  "sabah/nabawan": "Nabawan.jpg",
  "sabah/papar": "Papar.jpg",
  "sabah/penampang": "Penampang.jpg",
  "sabah/pitas": "Pitas.jpg",
  "sabah/putatan": "Putatan.jpg",
  "sabah/sandakan": "Sandakan.jpg",
  "sabah/semporna": "Semporna.png",
  "sabah/sipitang": "Sipitang.jpg",
  "sabah/tambunan": "Tambunan.jpg",
  "sabah/tawau": "Tawau.jpg",
  "sabah/telupid": "Telupid.jpg",
  "sabah/tenom": "Tenom.jpg",
  "sabah/tongod": "Tongod.jpg",
  "sabah/tuaran": "Tuaran.jpg",

  // Sarawak
  "sarawak/kuching": "Kuching.jpg",
  "sarawak/sibu": "Sibu.jpg",
  "sarawak/betong": "Betong.jpg",
  "sarawak/bintulu": "Bintulu.jpg",
  "sarawak/kapit": "Kapit.jpg",
  "sarawak/limbang": "Limbang.jpg",
  "sarawak/mukah": "Mukah.jpg",
  "sarawak/miri": "Niah Cave.jpg",
  "sarawak/samarahan": "Samarahan.jpg",
  "sarawak/sarikei": "Sarikei.jpg",
  "sarawak/serian": "Serian.jpg",
  "sarawak/sri aman": "Sri Aman.jpg",

  // Selangor
  "selangor/banting": "Banting.jpg",
  "selangor/gombak": "Gombak.jpg",
  "selangor/hulu langat": "Hulu Langat.jpg",
  "selangor/hulu selangor": "Hulu Selangor.jpg",
  "selangor/klang": "Klang.jpg",
  "selangor/port klang": "Klang.jpg",
  "selangor/kuala langat": "Kuala Langat.jpeg",
  "selangor/kuala selangor": "Kuala Selangor.jpg",
  "selangor/petaling": "Petaling.jpg",
  "selangor/petaling jaya": "Petaling.jpg",
  "selangor/puchong": "Petaling.jpg",
  "selangor/shah alam": "Petaling.jpg",
  "selangor/subang jaya": "Subang-Jaya.jpg",
  "selangor/sabak bernam": "Sabak Bernam.jpg",
  "selangor/sepang": "Sepang.jpg",
  "selangor/seri kembangan": "Seri-Kembangan.png",
  "selangor/sungai besar": "Sungai-Besar.png",
  "selangor/tanjong karang": "Tanjong-Karang.jpg",
  "selangor/telok panglima garang": "Telok-Panglima-Garang.jpg",

  // Terengganu
  "terengganu/besut": "besut pualu perhentian.jpg",
  "terengganu/dungun": "dungun.jpg",
  "terengganu/hulu terengganu": "hulu terengganu.jpg",
  "terengganu/kemaman": "kemaman.webp",
  "terengganu/kuala terengganu": "kuala-terengganu-drawbridge-min.jpg.webp",
  "terengganu/marang": "marang ganu.jpg",
  "terengganu/setiu": "setiu.jpg",

  // Wilayah Persekutuan
  "wilayah-persekutuan/putrajaya": "Putrajaya.jpg",
  "wilayah-persekutuan/kuala lumpur": "KL.jpg",
  "wilayah-persekutuan/kl": "KL.jpg",
  "wilayah-persekutuan/batu caves": "Batu-Caves KL.jpg",
  "wilayah-persekutuan/labuan": "Labuan.jpg",
};

/**
 * Get the state folder name from state string
 */
function getStateFolder(state: string): string | undefined {
  const normalized = state.toLowerCase().trim();
  return STATE_FOLDER_MAP[normalized];
}

/**
 * Get location image path for a destination
 * Returns the path relative to /public, or undefined if no image exists
 *
 * @param destinationName - The destination/city name (e.g., "Puchong", "Port Klang")
 * @param state - The state name (e.g., "Selangor", "Johor")
 * @returns The image path (e.g., "/images/locations/selangor/Petaling.jpg") or undefined
 */
export function getLocationImagePath(
  destinationName: string,
  state?: string
): string | undefined {
  if (!state) return undefined;

  const stateFolder = getStateFolder(state);
  if (!stateFolder) return undefined;

  const normalizedDestination = destinationName.toLowerCase().trim();
  const key = `${stateFolder}/${normalizedDestination}`;

  const imageName = LOCATION_IMAGES[key];
  if (!imageName) return undefined;

  return `/images/locations/${stateFolder}/${encodeURIComponent(imageName)}`;
}

/**
 * Get destination image URL with fallback
 * Priority: Landmark image → Charter image → undefined
 *
 * @param destinationName - The destination/city name
 * @param state - The state name
 * @param charterImage - Optional charter image URL as fallback
 * @returns The image URL to use
 */
export function getDestinationImage(
  destinationName: string,
  state?: string,
  charterImage?: string
): string | undefined {
  // Try to get landmark image first
  const landmarkImage = getLocationImagePath(destinationName, state);
  if (landmarkImage) return landmarkImage;

  // Fall back to charter image
  return charterImage;
}

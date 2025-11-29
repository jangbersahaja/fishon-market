/**
 * Image mapping helpers for destinations, fishing types, and techniques
 *
 * Note on City vs District Naming:
 * - Database stores city names (e.g., "Klang", "Shah Alam", "Port Klang")
 * - Images are organized by administrative districts (e.g., "klang", "petaling")
 * - This file tries city name first, then falls back to district image
 * - Uses city-district-mapping.ts for the fallback lookup
 */

import { getCityDistrict } from "./city-district-mapping";

/**
 * Map state names to their folders in /public/images/locations/
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
  putrajaya: "wilayah-persekutuan",
  labuan: "wilayah-persekutuan",
};

/**
 * Map location names (districts) to their image files
 * Format: "state/district" => "state/image-file.ext"
 */
const LOCATION_IMAGE_MAP: Record<string, string> = {
  // Selangor
  "selangor/gombak": "selangor/Gombak.jpg",
  "selangor/hulu langat": "selangor/Hulu Langat.jpg",
  "selangor/hulu selangor": "selangor/Hulu Selangor.jpg",
  "selangor/klang": "selangor/Klang.jpg",
  "selangor/port klang": "selangor/Klang.jpg",
  "selangor/kuala langat": "selangor/Kuala Langat.jpeg",
  "selangor/kuala selangor": "selangor/Kuala Selangor.jpg",
  "selangor/petaling": "selangor/Petaling.jpg",
  "selangor/sabak bernam": "selangor/Sabak Bernam.jpg",
  "selangor/sepang": "selangor/Sepang.jpg",

  // Johor
  "johor/batu pahat": "johor/batu-pahat.jpg",
  "johor/johor bahru": "johor/johor-bahru.avif",
  "johor/johor lama": "johor/johor-lama.jpg",
  "johor/kluang": "johor/kluang.jpg",
  "johor/kota tinggi": "johor/kota-tinggi.jpg",
  "johor/kulai": "johor/kulai.jpg",
  "johor/mersing": "johor/mersing.webp",
  "johor/muar": "johor/muar.jpg",
  "johor/pontian": "johor/pontian.jpg",
  "johor/segamat": "johor/segamat.webp",
  "johor/tangkak": "johor/tangkak.jpg",

  // Kedah
  "kedah/baling": "kedah/baling.jpg",
  "kedah/bandar baharu": "kedah/bandar baharu.jpeg",
  "kedah/kota setar": "kedah/kota setar.webp",
  "kedah/kubang pasu": "kedah/kubang pasu.jpg",
  "kedah/kulim": "kedah/kulim.jpg",
  "kedah/langkawi": "kedah/langkawi.png",
  "kedah/pendang": "kedah/pendang.jpg",
  "kedah/yan": "kedah/yan.jpg",

  // Kelantan
  "kelantan/bachok": "kelantan/bachok.jpg",
  "kelantan/gua musang": "kelantan/Gua_Musang_1.jpg",
  "kelantan/kota bharu": "kelantan/kota bharu .jpg",
  "kelantan/kuala krai": "kelantan/Kuala-Krai-Mini-Zoo.jpg.webp",
  "kelantan/pasir mas": "kelantan/pasir-mas.jpeg",
  "kelantan/tanah merah": "kelantan/Pasar-besar-tanah-merah.jpg",
  "kelantan/tumpat": "kelantan/tumpat.webp",

  // Melaka
  "melaka/alor gajah": "melaka/alor-gajah-freeport-2.jpg",
  "melaka/melaka tengah": "melaka/bandar-melaka.webp",
  "melaka/jasin": "melaka/Jasin_Hot_Spring.JPG",

  // Negeri Sembilan
  "negeri sembilan/jempol": "negeri-sembilan/jempol.JPG",
  "negeri sembilan/kuala pilah": "negeri-sembilan/PekanKualaPilah.png",
  "negeri sembilan/port dickson": "negeri-sembilan/port-dickson.jpeg.webp",
  "negeri sembilan/rembau": "negeri-sembilan/rembau.jpg",
  "negeri sembilan/seremban": "negeri-sembilan/seremban.jpg",
  "negeri sembilan/tampin": "negeri-sembilan/Pekan_Tampin.jpg",

  // Pahang
  "pahang/bentong": "pahang/bentong-min.jpg.webp",
  "pahang/bera": "pahang/Bera.jpg",
  "pahang/cameron highlands": "pahang/Cameron Highlands.jpg",
  "pahang/jerantut": "pahang/Jerantut.jpg",
  "pahang/kuantan": "pahang/Kuantan.jpg",
  "pahang/lipis": "pahang/Lipis.JPG",
  "pahang/maran": "pahang/Maran.jpg",
  "pahang/pekan": "pahang/Pekan.jpg",
  "pahang/raub": "pahang/Raub.jpg",
  "pahang/rompin": "pahang/Rompin.JPG",
  "pahang/temerloh": "pahang/Temerloh.jpg",

  // Perak
  "perak/batang padang": "perak/Batang Padang.jpg",
  "perak/hilir perak": "perak/Hilir Perak.png",
  "perak/hulu perak": "perak/Hulu Perak.jpg",
  "perak/kampar": "perak/Kampar.jpg",
  "perak/kerian": "perak/Kerian.jpg",
  "perak/kinta": "perak/Kinta.jpg",
  "perak/kuala kangsar": "perak/Kuala Kangsar.jpg",
  "perak/larut matang dan selama": "perak/Larut, Matang dan Selama.jpg",
  "perak/manjung": "perak/Manjung.jpg",
  "perak/muallim": "perak/Muallim.jpg",

  // Pulau Pinang
  "pulau pinang/balik pulau": "pulau-pinang/balik pulau street art.jpg",
  "pulau pinang/georgetown": "pulau-pinang/georgetown.jpg",
  "pulau pinang/seberang perai utara": "pulau-pinang/seberang perai utara.png",
  "pulau pinang/seberang perai tengah":
    "pulau-pinang/seberang perai  tengah.jpg",
  "pulau pinang/seberang perai selatan": "pulau-pinang/seberang perai.jpg",

  // Sabah
  "sabah/beaufort":
    "sabah/Beaufort_Sabah_Green-orange-and-pineapple-roundabout-01.jpg",
  "sabah/beluran": "sabah/Beluran.jpg",
  "sabah/kalabakan": "sabah/Kalabakan.jpg",
  "sabah/keningau": "sabah/Keningau.jpg",
  "sabah/kinabatangan": "sabah/Kinabatangan.jpg",
  "sabah/kota belud": "sabah/Kota Belud.jpg",
  "sabah/kota kinabalu": "sabah/Kota-Kinabalu.jpg",
  "sabah/kota marudu": "sabah/Kota Marudu.jpg",
  "sabah/kuala penyu": "sabah/Kuala Penyu.jpeg",
  "sabah/kudat": "sabah/Kudat.jpg",
  "sabah/kunak": "sabah/Kunak.jpg",
  "sabah/lahad datu": "sabah/ Lahad Datu.jpeg",
  "sabah/nabawan": "sabah/Nabawan.jpg",
  "sabah/papar": "sabah/Papar.jpg",
  "sabah/penampang": "sabah/Penampang.jpg",
  "sabah/pitas": "sabah/Pitas.jpg",
  "sabah/putatan": "sabah/Putatan.jpg",
  "sabah/ranau": "sabah/ Ranau.jpg",
  "sabah/sandakan": "sabah/Sandakan.jpg",
  "sabah/semporna": "sabah/Semporna.jpg",
  "sabah/sipitang": "sabah/Sipitang.jpg",
  "sabah/tambunan": "sabah/Tambunan.jpg",
  "sabah/tawau": "sabah/Tawau.jpg",
  "sabah/telupid": "sabah/Telupid.jpg",
  "sabah/tenom": "sabah/Tenom.jpg",
  "sabah/tongod": "sabah/Tongod.jpg",
  "sabah/tuaran": "sabah/Tuaran.jpg",

  // Sarawak
  "sarawak/betong": "sarawak/Betong.jpg",
  "sarawak/bintulu": "sarawak/Bintulu.jpg",
  "sarawak/kapit": "sarawak/Kapit.jpg",
  "sarawak/kuching": "sarawak/ Kuching.jpg",
  "sarawak/limbang": "sarawak/Limbang.jpg",
  "sarawak/miri": "sarawak/Niah Cave.jpg",
  "sarawak/mukah": "sarawak/Mukah.jpg",
  "sarawak/samarahan": "sarawak/Samarahan.jpg",
  "sarawak/sarikei": "sarawak/Sarikei.jpg",
  "sarawak/serian": "sarawak/Serian.jpg",
  "sarawak/sibu": "sarawak/ Sibu.jpg",
  "sarawak/sri aman": "sarawak/Sri Aman.jpg",

  // Terengganu
  "terengganu/besut": "terengganu/besut pualu perhentian.jpg",
  "terengganu/dungun": "terengganu/dungun.jpg",
  "terengganu/hulu terengganu": "terengganu/hulu terengganu.jpg",
  "terengganu/kemaman": "terengganu/kemaman.webp",
  "terengganu/kuala terengganu":
    "terengganu/kuala-terengganu-drawbridge-min.jpg.webp",
  "terengganu/marang": "terengganu/marang ganu.jpg",
  "terengganu/setiu": "terengganu/setiu.jpg",

  // Wilayah Persekutuan
  "wilayah persekutuan/kuala lumpur": "wilayah-persekutuan/KL.jpg",
  "wilayah persekutuan/putrajaya": "wilayah-persekutuan/ Putrajaya.jpg",
  "wilayah persekutuan/labuan": "wilayah-persekutuan/Labuan.jpg",
};

/**
 * Fishing type image mapping
 */
const FISHING_TYPE_IMAGE_MAP: Record<string, string> = {
  lake: "/images/types/Lake.jpeg",
  stream: "/images/types/stream.jpg",
  inshore: "/images/types/inshore.jpg",
  offshore: "/images/types/offshore.jpg",
};

/**
 * Fishing technique image mapping
 */
const FISHING_TECHNIQUE_IMAGE_MAP: Record<string, string> = {
  jigging: "/images/fishing-techniques/Jigging.png",
  trolling: "/images/fishing-techniques/Trolling.png",
  casting: "/images/fishing-techniques/Casting.png",
  "bottom fishing": "/images/fishing-techniques/Bottom.png",
  topwater: "/images/fishing-techniques/Casting.png", // Using casting as fallback
  "fly fishing": "/images/fishing-techniques/Fly Fishing.jpg",
  "drift fishing": "/images/fishing-techniques/Drift Fishing.png",
  "squid/eging": "/images/fishing-techniques/Eging.png",
  eging: "/images/fishing-techniques/Eging.png",
  "deep sea fishing": "/images/fishing-techniques/Deep Sea Fishing.jpeg",
  "prawn fishing": "/images/fishing-techniques/Prawn Fishing.png",
  apollo: "/images/fishing-techniques/Apollo.jpg",
};

/**
 * Get destination image path
 * Tries city/town name first, then falls back to district-level image
 * @param location - Location string (e.g., "Puchong", "Port Klang", "Klang")
 * @param state - Optional state name for better matching
 */
export function getDestinationImage(
  location: string,
  state?: string
): string | undefined {
  const loc = location.toLowerCase().trim();
  const st = state?.toLowerCase().trim();

  // Try direct match with state/location (city-level)
  if (st) {
    const stateFolder = STATE_FOLDER_MAP[st];
    if (stateFolder) {
      const cityKey = `${stateFolder}/${loc}`;
      if (LOCATION_IMAGE_MAP[cityKey]) {
        return `/images/locations/${LOCATION_IMAGE_MAP[cityKey]}`;
      }

      // Try district fallback: map city to district and use district image
      const district = getCityDistrict(loc);
      if (district !== loc) {
        const districtKey = `${stateFolder}/${district}`;
        if (LOCATION_IMAGE_MAP[districtKey]) {
          return `/images/locations/${LOCATION_IMAGE_MAP[districtKey]}`;
        }
      }
    }
  }

  // Try searching all states for this location (city first)
  for (const [key, path] of Object.entries(LOCATION_IMAGE_MAP)) {
    const [, district] = key.split("/");
    if (district === loc) {
      return `/images/locations/${path}`;
    }
  }

  // Try searching all states with district fallback
  const districtFallback = getCityDistrict(loc);
  if (districtFallback !== loc) {
    for (const [key, path] of Object.entries(LOCATION_IMAGE_MAP)) {
      const [, district] = key.split("/");
      if (district === districtFallback) {
        return `/images/locations/${path}`;
      }
    }
  }

  return undefined;
}

/**
 * Get fishing type image path
 */
export function getFishingTypeImage(type: string): string | undefined {
  const normalized = type.toLowerCase().trim();
  return FISHING_TYPE_IMAGE_MAP[normalized];
}

/**
 * Get fishing technique image path
 */
export function getFishingTechniqueImage(
  technique: string
): string | undefined {
  const normalized = technique.toLowerCase().trim();
  return FISHING_TECHNIQUE_IMAGE_MAP[normalized];
}

/**
 * Get all available states with at least one location image
 */
export function getAvailableStates(): string[] {
  const states = new Set<string>();
  Object.keys(LOCATION_IMAGE_MAP).forEach((key) => {
    const [state] = key.split("/");
    states.add(state);
  });
  return Array.from(states);
}

/**
 * Get all locations for a specific state
 */
export function getLocationsForState(state: string): string[] {
  const stateFolder = STATE_FOLDER_MAP[state.toLowerCase()];
  if (!stateFolder) return [];

  const locations: string[] = [];
  Object.keys(LOCATION_IMAGE_MAP).forEach((key) => {
    const [keyState, location] = key.split("/");
    if (keyState === stateFolder) {
      locations.push(location);
    }
  });

  return locations;
}

/**
 * Get all districts that have available images
 * Returns an array of district names (normalized, lowercase)
 */
export function getDistrictsWithImages(): string[] {
  const districts = new Set<string>();
  Object.keys(LOCATION_IMAGE_MAP).forEach((key) => {
    const [, district] = key.split("/");
    districts.add(district);
  });
  return Array.from(districts);
}

/**
 * Check if a district has an available image
 */
export function hasDistrictImage(district: string, state?: string): boolean {
  const image = getDestinationImage(district, state);
  return !!image;
}

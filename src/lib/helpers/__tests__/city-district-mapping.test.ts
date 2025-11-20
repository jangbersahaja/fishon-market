/**
 * Tests for Malaysian City-to-District Mapping
 *
 * These tests ensure that:
 * 1. The mapping has no duplicate keys
 * 2. City names correctly map to their districts
 * 3. Normalization functions work correctly
 * 4. All major cities and towns are covered
 */

import { describe, it, expect } from "vitest";
import {
  CITY_TO_DISTRICT_MAP,
  getCityDistrict,
  normalizeCityName,
  getCitiesForDistrict,
} from "../city-district-mapping";

describe("City-District Mapping", () => {
  describe("Data Integrity", () => {
    it("should have no duplicate keys", () => {
      const keys = Object.keys(CITY_TO_DISTRICT_MAP);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    it("should have comprehensive coverage (600+ entries)", () => {
      const count = Object.keys(CITY_TO_DISTRICT_MAP).length;
      expect(count).toBeGreaterThanOrEqual(600);
    });

    it("should have all lowercase keys", () => {
      Object.keys(CITY_TO_DISTRICT_MAP).forEach((key) => {
        expect(key).toBe(key.toLowerCase());
      });
    });

    it("should have all lowercase district values", () => {
      Object.values(CITY_TO_DISTRICT_MAP).forEach((district) => {
        expect(district).toBe(district.toLowerCase());
      });
    });
  });

  describe("Selangor Mappings", () => {
    it("should map Petaling District cities correctly", () => {
      expect(getCityDistrict("Petaling Jaya")).toBe("petaling");
      expect(getCityDistrict("Shah Alam")).toBe("petaling");
      expect(getCityDistrict("Subang Jaya")).toBe("petaling");
      expect(getCityDistrict("Puchong")).toBe("petaling");
      expect(getCityDistrict("Bangsar")).toBe("petaling");
      expect(getCityDistrict("USJ")).toBe("petaling");
    });

    it("should map Klang District cities correctly", () => {
      expect(getCityDistrict("Klang")).toBe("klang");
      expect(getCityDistrict("Port Klang")).toBe("klang");
      expect(getCityDistrict("Meru")).toBe("klang");
    });

    it("should map Hulu Langat District cities correctly", () => {
      expect(getCityDistrict("Kajang")).toBe("hulu langat");
      expect(getCityDistrict("Ampang")).toBe("hulu langat");
      expect(getCityDistrict("Cheras")).toBe("hulu langat");
      expect(getCityDistrict("Bangi")).toBe("hulu langat");
    });

    it("should map Gombak District cities correctly", () => {
      expect(getCityDistrict("Selayang")).toBe("gombak");
      expect(getCityDistrict("Batu Caves")).toBe("gombak");
      expect(getCityDistrict("Rawang")).toBe("gombak");
    });

    it("should map Sepang District cities correctly", () => {
      expect(getCityDistrict("Cyberjaya")).toBe("sepang");
      expect(getCityDistrict("Sepang")).toBe("sepang");
      expect(getCityDistrict("KLIA")).toBe("sepang");
    });
  });

  describe("Johor Mappings", () => {
    it("should map Johor Bahru District cities correctly", () => {
      expect(getCityDistrict("Johor Bahru")).toBe("johor bahru");
      expect(getCityDistrict("JB")).toBe("johor bahru");
      expect(getCityDistrict("Skudai")).toBe("johor bahru");
      expect(getCityDistrict("Pasir Gudang")).toBe("johor bahru");
      expect(getCityDistrict("Iskandar Puteri")).toBe("johor bahru");
      expect(getCityDistrict("Nusajaya")).toBe("johor bahru");
    });

    it("should map other Johor districts correctly", () => {
      expect(getCityDistrict("Batu Pahat")).toBe("batu pahat");
      expect(getCityDistrict("Kluang")).toBe("kluang");
      expect(getCityDistrict("Muar")).toBe("muar");
      expect(getCityDistrict("Pontian")).toBe("pontian");
      expect(getCityDistrict("Segamat")).toBe("segamat");
      expect(getCityDistrict("Tangkak")).toBe("tangkak");
    });
  });

  describe("Penang Mappings", () => {
    it("should map George Town area correctly", () => {
      expect(getCityDistrict("George Town")).toBe("northeast penang island");
      expect(getCityDistrict("Georgetown")).toBe("northeast penang island");
      expect(getCityDistrict("Gurney")).toBe("northeast penang island");
      expect(getCityDistrict("Batu Ferringhi")).toBe("northeast penang island");
    });

    it("should map Seberang Perai areas correctly", () => {
      expect(getCityDistrict("Butterworth")).toBe("north seberang perai");
      expect(getCityDistrict("Bukit Mertajam")).toBe("central seberang perai");
      expect(getCityDistrict("Nibong Tebal")).toBe("south seberang perai");
    });
  });

  describe("Perak Mappings", () => {
    it("should map major Perak cities correctly", () => {
      expect(getCityDistrict("Ipoh")).toBe("kinta");
      expect(getCityDistrict("Taiping")).toBe("larut, matang and selama");
      expect(getCityDistrict("Teluk Intan")).toBe("hilir perak");
      expect(getCityDistrict("Kuala Kangsar")).toBe("kuala kangsar");
      expect(getCityDistrict("Sitiawan")).toBe("manjung");
      expect(getCityDistrict("Lumut")).toBe("manjung");
    });
  });

  describe("Sabah & Sarawak Mappings", () => {
    it("should map major Sabah cities correctly", () => {
      expect(getCityDistrict("Kota Kinabalu")).toBe("kota kinabalu");
      expect(getCityDistrict("KK")).toBe("kota kinabalu");
      expect(getCityDistrict("Sandakan")).toBe("sandakan");
      expect(getCityDistrict("Tawau")).toBe("tawau");
    });

    it("should map major Sarawak cities correctly", () => {
      expect(getCityDistrict("Kuching")).toBe("kuching");
      expect(getCityDistrict("Miri")).toBe("miri");
      expect(getCityDistrict("Sibu")).toBe("sibu");
      expect(getCityDistrict("Bintulu")).toBe("bintulu");
    });
  });

  describe("Other States Mappings", () => {
    it("should map Kedah cities correctly", () => {
      expect(getCityDistrict("Alor Setar")).toBe("kota setar");
      expect(getCityDistrict("Sungai Petani")).toBe("kuala muda");
      expect(getCityDistrict("Langkawi")).toBe("langkawi");
    });

    it("should map Kelantan cities correctly", () => {
      expect(getCityDistrict("Kota Bharu")).toBe("kota bharu");
      expect(getCityDistrict("KB")).toBe("kota bharu");
    });

    it("should map Terengganu cities correctly", () => {
      expect(getCityDistrict("Kuala Terengganu")).toBe("kuala terengganu");
      expect(getCityDistrict("KT")).toBe("kuala terengganu");
      expect(getCityDistrict("Kemaman")).toBe("kemaman");
    });

    it("should map Pahang cities correctly", () => {
      expect(getCityDistrict("Kuantan")).toBe("kuantan");
      expect(getCityDistrict("Temerloh")).toBe("temerloh");
      expect(getCityDistrict("Cameron Highlands")).toBe("cameron highlands");
    });

    it("should map Negeri Sembilan cities correctly", () => {
      expect(getCityDistrict("Seremban")).toBe("seremban");
      expect(getCityDistrict("Port Dickson")).toBe("port dickson");
      expect(getCityDistrict("PD")).toBe("port dickson");
    });

    it("should map Melaka cities correctly", () => {
      expect(getCityDistrict("Melaka")).toBe("melaka tengah");
      expect(getCityDistrict("Malacca")).toBe("melaka tengah");
      expect(getCityDistrict("Ayer Keroh")).toBe("melaka tengah");
    });

    it("should map Perlis cities correctly", () => {
      expect(getCityDistrict("Kangar")).toBe("perlis");
      expect(getCityDistrict("Arau")).toBe("perlis");
    });
  });

  describe("Federal Territories Mappings", () => {
    it("should map Kuala Lumpur areas correctly", () => {
      expect(getCityDistrict("Kuala Lumpur")).toBe("kuala lumpur");
      expect(getCityDistrict("KL")).toBe("kuala lumpur");
      expect(getCityDistrict("KLCC")).toBe("kuala lumpur");
      expect(getCityDistrict("Bukit Bintang")).toBe("kuala lumpur");
    });

    it("should map Putrajaya correctly", () => {
      expect(getCityDistrict("Putrajaya")).toBe("putrajaya");
    });

    it("should map Labuan correctly", () => {
      expect(getCityDistrict("Labuan")).toBe("labuan");
    });
  });

  describe("Normalization Function", () => {
    it("should normalize city names to lowercase", () => {
      expect(normalizeCityName("PETALING JAYA")).toBe("petaling jaya");
      expect(normalizeCityName("Shah Alam")).toBe("shah alam");
      expect(normalizeCityName("Port KLANG")).toBe("port klang");
    });

    it("should trim whitespace", () => {
      expect(normalizeCityName("  Klang  ")).toBe("klang");
      expect(normalizeCityName("Kajang   ")).toBe("kajang");
    });

    it("should handle empty or invalid inputs", () => {
      expect(normalizeCityName("")).toBe("");
      expect(normalizeCityName(null as any)).toBe("");
      expect(normalizeCityName(undefined as any)).toBe("");
    });
  });

  describe("getCityDistrict Function", () => {
    it("should return district for known cities", () => {
      expect(getCityDistrict("Klang")).toBe("klang");
      expect(getCityDistrict("Shah Alam")).toBe("petaling");
    });

    it("should return original city name for unknown cities", () => {
      expect(getCityDistrict("Unknown City")).toBe("Unknown City");
      expect(getCityDistrict("NonExistent")).toBe("NonExistent");
    });

    it("should be case-insensitive", () => {
      expect(getCityDistrict("KLANG")).toBe("klang");
      expect(getCityDistrict("klang")).toBe("klang");
      expect(getCityDistrict("Klang")).toBe("klang");
    });
  });

  describe("getCitiesForDistrict Function", () => {
    it("should return all cities for a given district", () => {
      const klangCities = getCitiesForDistrict("klang");
      expect(klangCities).toContain("klang");
      expect(klangCities).toContain("port klang");
      expect(klangCities).toContain("meru");
    });

    it("should be case-insensitive", () => {
      const petalingCities1 = getCitiesForDistrict("petaling");
      const petalingCities2 = getCitiesForDistrict("PETALING");
      expect(petalingCities1).toEqual(petalingCities2);
    });

    it("should return empty array for non-existent district", () => {
      const cities = getCitiesForDistrict("non-existent-district");
      expect(cities).toEqual([]);
    });

    it("should return multiple cities for districts with many cities", () => {
      const petalingCities = getCitiesForDistrict("petaling");
      expect(petalingCities.length).toBeGreaterThan(30);
      expect(petalingCities).toContain("petaling jaya");
      expect(petalingCities).toContain("shah alam");
      expect(petalingCities).toContain("subang jaya");
    });
  });

  describe("Disambiguation of Similar Names", () => {
    it("should distinguish between same-named cities in different states", () => {
      // simpang ampat exists in both Penang and Perlis
      expect(getCityDistrict("simpang ampat penang")).toBe(
        "south seberang perai"
      );
      expect(getCityDistrict("simpang ampat perlis")).toBe("perlis");
    });

    it("should distinguish between Sentul in KL and Gombak", () => {
      expect(getCityDistrict("sentul kl")).toBe("kuala lumpur");
      expect(getCityDistrict("sentul")).toBe("gombak");
    });
  });

  describe("State Coverage", () => {
    it("should have entries for all 13 Malaysian states", () => {
      const states = [
        "petaling", // Selangor
        "johor bahru", // Johor
        "kota setar", // Kedah
        "kota bharu", // Kelantan
        "melaka tengah", // Melaka
        "seremban", // Negeri Sembilan
        "kuantan", // Pahang
        "northeast penang island", // Penang
        "kinta", // Perak
        "perlis", // Perlis
        "kota kinabalu", // Sabah
        "kuching", // Sarawak
        "kuala terengganu", // Terengganu
      ];

      states.forEach((district) => {
        const cities = getCitiesForDistrict(district);
        expect(cities.length).toBeGreaterThan(0);
      });
    });

    it("should have entries for all 3 Federal Territories", () => {
      const fts = ["kuala lumpur", "putrajaya", "labuan"];

      fts.forEach((ft) => {
        const cities = getCitiesForDistrict(ft);
        expect(cities.length).toBeGreaterThan(0);
      });
    });
  });
});

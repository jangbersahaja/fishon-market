// Amenities options with English and Malay labels
export const AMENITIES_OPTIONS = [
  { key: "live_bait", label: "Live bait", labelMy: "Umpan Hidup" },
  { key: "lures", label: "Lures", labelMy: "Umpan Tiruan" },
  { key: "rod_reel", label: "Rod & reel", labelMy: "Rod & Reel" },
  {
    key: "terminal_tackle",
    label: "Terminal Tackle",
    labelMy: "Terminal Tackle",
  },
  { key: "snacks", label: "Snacks", labelMy: "Makanan Ringan" },
  { key: "drinks", label: "Drinks", labelMy: "Minuman" },
  { key: "meals", label: "Meals", labelMy: "Lunch/Dinner" },
  { key: "life_jackets", label: "Life jackets", labelMy: "Jaket Keselamatan" },
];

export type AmenityOption = (typeof AMENITIES_OPTIONS)[number];

/**
 * Charter type options with English and Malay labels
 * Source: fishon-captain/src/utils/captainFormData.ts
 */
export const CHARTER_TYPES = [
  { value: "lake", label: "Lake / Dam", labelMy: "Tasik" },
  { value: "stream", label: "Stream", labelMy: "Sungai" },
  {
    value: "inshore",
    label: "Inshore / Island",
    labelMy: "Persisir",
  },
  {
    value: "offshore",
    label: "Offshore / Deepsea",
    labelMy: "Laut Dalam",
  },
  {
    value: "jungle",
    label: "Jungle / Waterfall",
    labelMy: "Hutan",
  },
];

export type CharterTypeOption = (typeof CHARTER_TYPES)[number];
export type CharterTypeValue = CharterTypeOption["value"];

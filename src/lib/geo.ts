// Geography helpers: state names, USFS region membership, and the logic for
// deciding which series "cover" a state. Series exist at many grains
// (state, sub-state, USFS region, multi-state) — see /about.
import type { Series } from "./types";

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

/** FIPS -> USPS, for joining the us-atlas topojson to our data. */
export const FIPS_TO_USPS: Record<string, string> = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO",
  "09": "CT", "10": "DE", "12": "FL", "13": "GA", "15": "HI", "16": "ID",
  "17": "IL", "18": "IN", "19": "IA", "20": "KS", "21": "KY", "22": "LA",
  "23": "ME", "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
  "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH", "34": "NJ",
  "35": "NM", "36": "NY", "37": "NC", "38": "ND", "39": "OH", "40": "OK",
  "41": "OR", "42": "PA", "44": "RI", "45": "SC", "46": "SD", "47": "TN",
  "48": "TX", "49": "UT", "50": "VT", "51": "VA", "53": "WA", "54": "WV",
  "55": "WI", "56": "WY",
};

/**
 * USFS National Forest System region membership (administrative regions;
 * R1/R4 and R2/R4 overlap in ID/WY). Used to say a USFS-region series
 * "covers" a state. There is no R7.
 */
export const USFS_REGION_STATES: Record<string, string[]> = {
  r1: ["MT", "ID", "ND", "SD"],
  r2: ["CO", "KS", "NE", "SD", "WY"],
  r3: ["AZ", "NM"],
  r4: ["ID", "NV", "UT", "WY"],
  r5: ["CA"],
  r6: ["OR", "WA"],
  r8: ["AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "OK", "SC", "TN", "TX", "VA"],
  r9: [
    "CT", "DE", "IL", "IN", "IA", "ME", "MD", "MA", "MI", "MN", "MO", "NH",
    "NJ", "NY", "OH", "PA", "RI", "VT", "WV", "WI",
  ],
  r10: ["AK"],
};

export const USFS_REGION_NAMES: Record<string, string> = {
  r1: "Northern Region (R1)",
  r2: "Rocky Mountain Region (R2)",
  r3: "Southwestern Region (R3)",
  r4: "Intermountain Region (R4)",
  r5: "Pacific Southwest Region (R5)",
  r6: "Pacific Northwest Region (R6)",
  r8: "Southern Region (R8)",
  r9: "Eastern Region (R9)",
  r10: "Alaska Region (R10)",
};

/** Multi-state regions that aren't keyed r1..r10 in the region code. */
const MULTI_STATE_REGIONS: Record<string, string[]> = {
  mt_bber_r2: ["MT", "WY", "SD", "NE"],
  mt_bber_r4: ["MT", "ID", "WY", "UT"],
};

/** Extract the USFS region number key (r1..r10) from a region_code. */
export function usfsRegionKey(regionCode: string): string | null {
  const m = regionCode.match(/(?:^|_)r(\d{1,2})(?:_|$)/);
  return m ? `r${m[1]}` : null;
}

/** States a series covers (one for state-grain, several for regional grains). */
export function seriesStates(s: Series): string[] {
  if (s.state) return [s.state];
  if (s.region_type === "usfs_region") {
    const key = usfsRegionKey(s.region);
    if (key && USFS_REGION_STATES[key]) return USFS_REGION_STATES[key];
  }
  if (s.region_type === "multi_state_avg") {
    return MULTI_STATE_REGIONS[s.region] ?? [];
  }
  // national_forest series are NOT attributed to states: a forest sits in one
  // (occasionally two) states, but the export carries no forest->state map, and
  // attributing a forest to every state in its USFS region would badly overstate
  // coverage. Browse forests via their USFS region / source instead.
  return [];
}

export const REGION_TYPE_LABELS: Record<string, string> = {
  state_avg: "State average",
  statewide: "Statewide",
  sub_state: "Sub-state region",
  peninsula: "Peninsula (MI)",
  state_forest: "State forest (MI)",
  management_unit: "Forest management unit (MI)",
  district: "ODF district (OR)",
  land_office: "DNRC land office (MT)",
  usfs_region: "USFS region",
  national_forest: "National forest",
  multi_state_avg: "Multi-state average",
};

/** Direct (state-grain or sub-state) vs regional (multi-state) coverage. */
export function coverageKind(s: Series): "direct" | "regional" {
  return s.state ? "direct" : "regional";
}

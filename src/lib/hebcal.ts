// ─── HebCal API Integration ───
// Server-side utilities for fetching the current Hebrew date
// with sunset-based day change logic.

// ─── Configuration (from .env) ───
const DEFAULT_GEONAMEID = parseInt(process.env.HEBCAL_GEONAMEID || "281184", 10); // 281184 = Jerusalem
const DEFAULT_TIMEZONE = process.env.HEBCAL_TIMEZONE || "Asia/Jerusalem";

// ─── Types ───
export type HebrewDateInfo = {
  day: number;           // Day number (1-30)
  month: string;         // Sipuraya DB month name (e.g. "Nissan", "Adar")
  monthHe: string;       // Hebrew month name (e.g. "ניסן", "אדר")
  dayHe: string;         // Day in gematria (e.g. "י״ז")
  year: number;          // Hebrew year (e.g. 5786)
  displayEn: string;     // DB-compatible format: "17 Adar"
  displayHe: string;     // DB-compatible format: "י״ז אדר"
  fullHe: string;        // Full HebCal Hebrew string
};

export type HebrewDateResponse = {
  hebrewDate: HebrewDateInfo;
  afterSunset: boolean;
  sunset: string | null;
  events: string[];
};

// ─── Month Mapping ───
// HebCal uses different transliterations for 3 months.
// We remap to match Sipuraya's DB convention (verified from actual data).

const HEBCAL_TO_SIPURAYA_MONTH: Record<string, string> = {
  "Nisan": "Nissan",
  "Iyyar": "Iyar",
  "Sh'vat": "Shevat",
};

// Sipuraya month → Hebrew name (same as ingest route's HEBREW_MONTH_NAMES)
const SIPURAYA_MONTH_TO_HEBREW: Record<string, string> = {
  "Nissan": "ניסן",
  "Iyar": "אייר",
  "Sivan": "סיון",
  "Tamuz": "תמוז",
  "Av": "אב",
  "Elul": "אלול",
  "Tishrei": "תשרי",
  "Cheshvan": "חשון",
  "Kislev": "כסלו",
  "Tevet": "טבת",
  "Shevat": "שבט",
  "Adar": "אדר",
  "Adar I": "אדר א",
  "Adar II": "אדר ב",
};

// ─── HebCal API Types ───
type HebCalConverterResponse = {
  gy: number;
  gm: number;
  gd: number;
  afterSunset: boolean;
  hy: number;
  hm: string;
  hd: number;
  hebrew: string;
  heDateParts: {
    y: string;
    m: string;
    d: string;
  };
  events: string[];
};

type HebCalZmanimResponse = {
  times: {
    sunset: string;
    [key: string]: string;
  };
};

// ─── Core Logic ───

/**
 * Convert a HebCal month name to Sipuraya's DB convention.
 */
function mapMonth(hebcalMonth: string): string {
  return HEBCAL_TO_SIPURAYA_MONTH[hebcalMonth] || hebcalMonth;
}

/**
 * Get the Hebrew name for a Sipuraya month.
 */
function getHebrewMonthName(sipurayaMonth: string): string {
  return SIPURAYA_MONTH_TO_HEBREW[sipurayaMonth] || sipurayaMonth;
}

/**
 * Format the current date as YYYY-MM-DD in the given timezone.
 */
function todayInTimezone(tz: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${year}-${month}-${day}`;
}

/**
 * Fetch sunset time from HebCal Zmanim API.
 * Default geonameid 281184 = Jerusalem, Israel.
 */
async function fetchSunset(
  date: string,
  geonameid: number = 281184
): Promise<string | null> {
  try {
    const url = `https://www.hebcal.com/zmanim?cfg=json&geonameid=${geonameid}&date=${date}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data: HebCalZmanimResponse = await res.json();
    return data.times?.sunset || null;
  } catch {
    return null;
  }
}

/**
 * Fetch the current Hebrew date from HebCal Converter API.
 * Automatically determines if we are past sunset in Jerusalem
 * and adjusts the Hebrew date accordingly.
 */
export async function fetchHebrewDate(
  geonameid: number = DEFAULT_GEONAMEID,
  timezone: string = DEFAULT_TIMEZONE
): Promise<HebrewDateResponse> {
  // 1. Get today's date in the target timezone
  const today = todayInTimezone(timezone);

  // 2. Get sunset time for today
  const sunset = await fetchSunset(today, geonameid);

  // 3. Determine if we are after sunset
  let afterSunset = false;
  if (sunset) {
    const now = new Date();
    const sunsetDate = new Date(sunset);
    afterSunset = now > sunsetDate;
  }

  // 4. Fetch Hebrew date from Converter API
  const converterUrl = new URL("https://www.hebcal.com/converter");
  converterUrl.searchParams.set("cfg", "json");
  converterUrl.searchParams.set("date", today);
  converterUrl.searchParams.set("g2h", "1");
  converterUrl.searchParams.set("strict", "1");
  if (afterSunset) {
    converterUrl.searchParams.set("afterSunset", "on");
  }

  const res = await fetch(converterUrl.toString());
  if (!res.ok) {
    throw new Error(`HebCal Converter API error: ${res.status}`);
  }
  const data: HebCalConverterResponse = await res.json();

  // 5. Map month names to Sipuraya convention
  const sipurayaMonth = mapMonth(data.hm);
  const monthHe = getHebrewMonthName(sipurayaMonth);

  return {
    hebrewDate: {
      day: data.hd,
      month: sipurayaMonth,
      monthHe,
      dayHe: data.heDateParts.d,
      year: data.hy,
      displayEn: `${data.hd} ${sipurayaMonth}`,
      displayHe: `${data.heDateParts.d} ${monthHe}`,
      fullHe: data.hebrew,
    },
    afterSunset,
    sunset,
    events: data.events || [],
  };
}

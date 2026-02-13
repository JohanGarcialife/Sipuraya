import { NextResponse } from "next/server";
import { fetchHebrewDate } from "@/lib/hebcal";

export const runtime = "nodejs";

// Revalidate every 5 minutes (300 seconds)
export const revalidate = 300;

/**
 * GET /api/hebrew-date
 * 
 * Returns the current Hebrew date with sunset-based day change.
 * 
 * Query params:
 *   geonameid (optional) - GeoNames ID for sunset calculation. Default: 281184 (Jerusalem)
 * 
 * Example response:
 *   {
 *     "hebrewDate": {
 *       "day": 17,
 *       "month": "Adar",
 *       "monthHe": "אדר",
 *       "dayHe": "י״ז",
 *       "year": 5786,
 *       "displayEn": "17 Adar",
 *       "displayHe": "י״ז אדר",
 *       "fullHe": "י״ז בְּאַדָר תשפ״ו"
 *     },
 *     "afterSunset": false,
 *     "sunset": "2026-02-12T17:23:00+02:00",
 *     "events": ["Parashat Mishpatim"]
 *   }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const geonameid = parseInt(searchParams.get("geonameid") || "281184", 10);

    const result = await fetchHebrewDate(geonameid);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Hebrew date API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Hebrew date" },
      { status: 500 }
    );
  }
}

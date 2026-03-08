"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";

/**
 * Convert a text address to a what3words 3-word location.
 *
 * Flow:
 *  1. Geocode the address string to lat/lng via OpenStreetMap Nominatim (free, no key)
 *  2. Convert those coordinates to a what3words address via the w3w API
 *
 * Requires WHAT3WORDS_API_KEY to be set in Convex environment variables:
 *   npx -w packages/backend convex env set WHAT3WORDS_API_KEY=your_key_here
 */
export const convertAddressToWhat3Words = action({
  args: { address: v.string() },
  returns: v.union(
    v.object({
      words: v.string(),
      nearestPlace: v.optional(v.string()),
      country: v.optional(v.string()),
      lat: v.number(),
      lng: v.number(),
    }),
    v.null()
  ),
  handler: async (_ctx, args) => {
    const apiKey = process.env.WHAT3WORDS_API_KEY;
    if (!apiKey) {
      throw new Error(
        "WHAT3WORDS_API_KEY is not configured. Run: npx -w packages/backend convex env set WHAT3WORDS_API_KEY=your_key"
      );
    }

    // Step 1: Geocode the address to coordinates via Nominatim
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(args.address)}&format=json&limit=1`;
    const geocodeRes = await fetch(geocodeUrl, {
      headers: {
        "User-Agent": "PlayerARC/1.0 (player development platform)",
        Accept: "application/json",
      },
    });

    if (!geocodeRes.ok) {
      throw new Error(`Geocoding failed: ${geocodeRes.statusText}`);
    }

    const geocodeData = (await geocodeRes.json()) as Array<{
      lat: string;
      lon: string;
    }>;

    if (!geocodeData.length) {
      return null; // Address not found
    }

    const lat = Number.parseFloat(geocodeData[0].lat);
    const lng = Number.parseFloat(geocodeData[0].lon);

    // Step 2: Convert coordinates to what3words
    const w3wUrl = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat}%2C${lng}&format=json`;
    const w3wRes = await fetch(w3wUrl, {
      headers: {
        Accept: "application/json",
        "X-Api-Key": apiKey,
      },
    });

    const w3wData = (await w3wRes.json()) as {
      words?: string;
      nearestPlace?: string;
      country?: { name?: string };
      error?: { code: string; message: string };
    };

    if (!w3wRes.ok || w3wData.error) {
      const code = w3wData.error?.code ?? w3wRes.status;
      const message = w3wData.error?.message ?? w3wRes.statusText;
      throw new Error(`what3words error [${code}]: ${message}`);
    }

    if (!w3wData.words) {
      return null;
    }

    return {
      words: w3wData.words,
      nearestPlace: w3wData.nearestPlace,
      country: w3wData.country?.name,
      lat,
      lng,
    };
  },
});

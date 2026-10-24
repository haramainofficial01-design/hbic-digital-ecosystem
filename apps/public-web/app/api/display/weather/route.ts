import { jsonResponse, optionsResponse } from "../../../../lib/api";
import { getPublishedContent } from "../../../../lib/contentStore";

export const dynamic = "force-dynamic";

const weatherLabels: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm"
};

export function OPTIONS() {
  return optionsResponse();
}

export async function GET() {
  try {
    const { content } = await getPublishedContent();
    const { latitude, longitude } = content.settings.location;
    const endpoint = new URL("https://api.open-meteo.com/v1/forecast");
    endpoint.searchParams.set("latitude", String(latitude));
    endpoint.searchParams.set("longitude", String(longitude));
    endpoint.searchParams.set(
      "current",
      "temperature_2m,weather_code,cloud_cover,precipitation,rain,showers,snowfall,wind_speed_10m,wind_direction_10m,wind_gusts_10m"
    );
    endpoint.searchParams.set("timezone", "America/Edmonton");
    const response = await fetch(endpoint, { next: { revalidate: 300 }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("Weather service unavailable.");
    const data = await response.json() as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        cloud_cover?: number;
        precipitation?: number;
        rain?: number;
        showers?: number;
        snowfall?: number;
        wind_speed_10m?: number;
        wind_direction_10m?: number;
        wind_gusts_10m?: number;
        time?: string;
      };
    };
    const temperature = data.current?.temperature_2m;
    const code = data.current?.weather_code;
    if (typeof temperature !== "number" || typeof code !== "number") throw new Error("Weather reading unavailable.");
    return jsonResponse({
      ok: true,
      temperature: Math.round(temperature),
      condition: weatherLabels[code] ?? "Current conditions",
      weatherCode: code,
      cloudCover: data.current?.cloud_cover,
      precipitation: data.current?.precipitation,
      rain: data.current?.rain,
      showers: data.current?.showers,
      snowfall: data.current?.snowfall,
      windSpeed: data.current?.wind_speed_10m,
      windDirection: data.current?.wind_direction_10m,
      windGusts: data.current?.wind_gusts_10m,
      observedAt: data.current?.time
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Weather unavailable." }, { status: 503 });
  }
}

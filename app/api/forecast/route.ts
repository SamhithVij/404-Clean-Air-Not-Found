
import { NextResponse } from "next/server";

export async function GET() {
  const params = new URLSearchParams({
    latitude: "28.6139",
    longitude: "77.2090",
    hourly: "pm2_5",
    forecast_days: "3",
    timezone: "Asia/Kolkata",
  });

  try {
    const response = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Air-quality forecast provider is unavailable." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const times: string[] = data.hourly?.time ?? [];
    const values: (number | null)[] = data.hourly?.pm2_5 ?? [];

    if (!times.length || times.length !== values.length) {
      return NextResponse.json(
        { error: "The provider returned incomplete forecast data." },
        { status: 502 }
      );
    }

    const forecast = times
      .map((time, index) => ({
        time,
        pm25: values[index],
      }))
      .filter(
        (point): point is { time: string; pm25: number } =>
          typeof point.pm25 === "number" &&
          Number.isFinite(point.pm25)
      );

    if (!forecast.length) {
      return NextResponse.json(
        { error: "No valid PM2.5 forecast values were returned." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      location: "Delhi, India",
      source: "Open-Meteo Air Quality API",
      sourceUrl: "https://open-meteo.com/en/docs/air-quality-api",
      fetchedAt: new Date().toISOString(),
      timezone: "Asia/Kolkata",
      unit: "µg/m³",
      forecast,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not connect to the air-quality forecast provider." },
      { status: 502 }
    );
  }
}

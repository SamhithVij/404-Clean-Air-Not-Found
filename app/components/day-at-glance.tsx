
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { activities } from "../data/demo-school";
import { useAirQuality } from "../hooks/use-air-quality";
import {
  classifyActivityAirQuality,
  ILLUSTRATIVE_PM25_THRESHOLD,
} from "../lib/recommendations";

const chartActivities = activities.filter(
  (activity) => activity.id !== "pe-8"
);

const COLORS = {
  blue: "#087FC1",
  blueDark: "#06699F",
  afternoon: "#4689B8",
  orange: "#F07828",
  orangeDark: "#A6531D",
  green: "#278A5B",
  greenDark: "#216E49",
  text: "#46544C",
  muted: "#657168",
  heading: "#172019",
  border: "#DDE4DE",
  grid: "#E4EBE6",
  surface: "#F8FAF7",
};

export default function DayAtGlance() {
  const {
    forecast,
    forecastDate,
    loading,
    error,
    source,
    fetchedAt,
    location,
  } = useAirQuality();

  const chartData = forecast
    .filter((point) => {
      const [hour] = point.time.split(":").map(Number);
      return hour >= 8 && hour < 16 && Number.isFinite(point.pm25);
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  const highestPm25 = Math.max(
    0,
    ...chartData.map((point) => point.pm25)
  );
  const chartMax = Math.max(
    60,
    Math.ceil((highestPm25 * 1.15) / 10) * 10
  );

  const formattedDate = forecastDate
    ? new Date(`${forecastDate}T12:00:00+05:30`).toLocaleDateString(
        "en-IN",
        {
          timeZone: "Asia/Kolkata",
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      )
    : null;

  const formattedFetchTime = fetchedAt
    ? new Date(fetchedAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const activityStartTimes = [
    ...new Set(chartActivities.map((activity) => activity.time)),
  ].sort();

  return (
    <section className="rounded-2xl border border-[#D5DFD8] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#087FC1]">
            The day at a glance
          </p>

          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#172019]">
            Understand the forecast. Plan the school day.
          </h2>

          <p className="mt-2 text-xs leading-5 text-[#46544C]">
            {loading
              ? "Loading air-quality forecast…"
              : error
                ? "Forecast unavailable"
                : `${location} · ${formattedDate ?? "Date unavailable"} · PM2.5 in µg/m³`}
          </p>

          {!loading && !error && source && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-[#46544C]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B9E0CA] bg-[#EAF7EF] px-2.5 py-1 font-semibold text-[#216E49]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#278A5B]" />
                Forecast connected
              </span>

              <span>Source: {source}</span>

              {formattedFetchTime && (
                <span>Fetched: {formattedFetchTime} IST</span>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-2 text-xs text-[#46544C]">
          <span className="flex items-center gap-2">
            <span className="h-[3px] w-5 rounded-full bg-[#087FC1]" />
            Forecast
          </span>

          <span className="flex items-center gap-2">
            <span className="h-0 w-5 border-t-2 border-dashed border-[#F07828]" />
            Illustrative reference
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[280px] items-center justify-center rounded-xl border border-[#E4EBE6] bg-[#F8FAF7]">
          <p className="text-sm text-[#46544C]">
            Fetching the air-quality forecast…
          </p>
        </div>
      ) : error || chartData.length === 0 ? (
        <div className="flex h-[280px] flex-col items-center justify-center rounded-xl border border-[#E4EBE6] bg-[#F8FAF7] px-6 text-center">
          <p className="text-sm font-semibold text-[#172019]">
            Forecast unavailable
          </p>

          <p className="mt-2 max-w-md text-xs leading-5 text-[#46544C]">
            {error ??
              "No forecast values are available between 08:00 and 16:00."}
          </p>

          <p className="mt-2 text-[11px] text-[#657168]">
            No simulated values are substituted for missing forecast data.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#46544C]">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#F07828]/20 ring-1 ring-[#F07828]/70" />
              Morning window · 09:30–12:15
            </span>

            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-[#4689B8]/20 ring-1 ring-[#4689B8]/70" />
              Afternoon window · 13:00–15:45
            </span>

            <span className="flex items-center gap-2">
              <span className="h-0 w-4 border-t border-dashed border-[#84938A]" />
              Scheduled activity start
            </span>
          </div>

          <div className="h-[300px] w-full sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 12, left: 4, bottom: 12 }}
              >
                <ReferenceArea
                  x1="09:30"
                  x2="12:15"
                  y1={0}
                  y2={chartMax}
                  fill="#F07828"
                  fillOpacity={0.14}
                  ifOverflow="hidden"
                />

                <ReferenceArea
                  x1="13:00"
                  x2="15:45"
                  y1={0}
                  y2={chartMax}
                  fill="#4689B8"
                  fillOpacity={0.13}
                  ifOverflow="hidden"
                />

                <CartesianGrid
                  stroke={COLORS.grid}
                  strokeDasharray="3 4"
                  vertical={false}
                />

                <XAxis
                  dataKey="time"
                  interval="preserveStartEnd"
                  minTickGap={24}
                  tick={{ fontSize: 11, fill: COLORS.text }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: string) =>
                    activityStartTimes.includes(value)
                      ? `${value} •`
                      : value
                  }
                />

                <YAxis
                  domain={[0, chartMax]}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: COLORS.text }}
                  axisLine={false}
                  tickLine={false}
                  width={43}
                  label={{
                    value: "PM2.5 (µg/m³)",
                    angle: -90,
                    position: "insideLeft",
                    fill: COLORS.text,
                    fontSize: 10,
                  }}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #DDE4DE",
                    borderRadius: "10px",
                    boxShadow: "0 4px 14px rgba(23,32,25,0.08)",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [
                    `${value} µg/m³`,
                    "Forecast PM2.5",
                  ]}
                  labelFormatter={(label) => `Time: ${label}`}
                />

                <ReferenceLine
                  y={ILLUSTRATIVE_PM25_THRESHOLD}
                  stroke={COLORS.orange}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  label={{
                    value: `${ILLUSTRATIVE_PM25_THRESHOLD} · illustrative reference`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: COLORS.orangeDark,
                  }}
                />

                {activityStartTimes.map((time) => (
                  <ReferenceLine
                    key={time}
                    x={time}
                    stroke="#84938A"
                    strokeDasharray="3 5"
                    strokeOpacity={0.75}
                  />
                ))}

                <Line
                  type="monotone"
                  dataKey="pm25"
                  name="Forecast PM2.5"
                  stroke={COLORS.blue}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: COLORS.blue,
                    stroke: "#FFFFFF",
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[10px] font-medium">
            <span className="text-[#087FC1]">
              Forecast · {chartData[0].time}–
              {chartData[chartData.length - 1].time}
            </span>

            <span className="text-[#46544C]">
              Dashed vertical markers = scheduled activity start times
            </span>
          </div>
        </>
      )}

      <div className="mt-5 border-t border-[#DDE4DE] pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#46544C]">
            Scheduled outdoor activities
          </p>

          <span className="text-[11px] text-[#46544C]">
            Activity-window average · reference ≥{" "}
            {ILLUSTRATIVE_PM25_THRESHOLD} µg/m³
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {chartActivities.map((activity) => {
            const classification =
              loading || error
                ? null
                : classifyActivityAirQuality(activity, forecast);

            const elevated = classification?.elevated === true;

            const unavailable =
              loading ||
              Boolean(error) ||
              classification?.averagePm25 == null;

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-xl border border-[#E2EAE4] bg-[#F8FAF7] px-3.5 py-3 transition-colors hover:border-[#C8D8CE]"
              >
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    unavailable
                      ? "bg-[#9CA3AF]"
                      : elevated
                        ? "bg-[#F07828]"
                        : "bg-[#278A5B]"
                  }`}
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[#172019]">
                    {activity.name}
                  </p>

                  <p className="mt-1 text-[11px] tabular-nums text-[#46544C]">
                    {activity.time}–{activity.end}
                  </p>

                  <p
                    className={`mt-1.5 text-[11px] font-semibold ${
                      unavailable
                        ? "text-[#657168]"
                        : elevated
                          ? "text-[#A6531D]"
                          : "text-[#216E49]"
                    }`}
                  >
                    {loading
                      ? "Loading forecast…"
                      : error
                        ? "Forecast unavailable"
                        : classification?.averagePm25 == null
                          ? "No forecast for this window"
                          : `${classification.label} · ${classification.averagePm25} µg/m³`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-[#E4EBE6] pt-3 text-[11px] leading-5 text-[#46544C]">
        PM2.5 values are modelled forecasts, not live measurements from a
        local monitoring station. Activity labels use the average forecast
        during each scheduled window. The{" "}
        {ILLUSTRATIVE_PM25_THRESHOLD} µg/m³ threshold is an illustrative
        planning reference, not a validated school safety standard. Neither
        the forecast nor these classifications determine whether an activity
        is safe.
      </div>
    </section>
  );
}

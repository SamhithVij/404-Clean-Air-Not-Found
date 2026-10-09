
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

const chartActivities = activities.filter(
  (activity) => activity.id !== "pe-8"
);

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

  const chartData = forecast.filter((point) => {
    const [hour] = point.time.split(":").map(Number);
    return hour >= 8 && hour < 16;
  });

  const chartMax = Math.max(
    60,
    Math.ceil(
      Math.max(0, ...chartData.map((point) => point.pm25)) / 10
    ) * 10
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

  return (
    <section className="rounded-2xl border border-[#dfe6df] bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d766f]">
            The day at a glance
          </p>

          <h2 className="mt-1 text-xl font-medium text-[#17201a]">
            Pollution rises. The school day continues.
          </h2>

          <p className="mt-1 text-xs text-[#7a827c]">
            {loading
              ? "Loading air-quality forecast…"
              : error
                ? "Live forecast unavailable"
                : `${location} · ${formattedDate} · PM2.5 in µg/m³`}
          </p>

          {!loading && !error && source && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#59645C]">
              <span className="rounded-full bg-[#EEF7F0] px-2 py-1 font-semibold text-[#278A5B]">
                Live API connected
              </span>
              <span>Source: {source}</span>
              {formattedFetchTime && (
                <span>Fetched: {formattedFetchTime} IST</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-[#68716a]">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-[#1597d3]" />
            Forecast
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-[#e59b59]" />
            Planning reference
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-[280px] items-center justify-center rounded-lg bg-[#F8FAF7]">
          <p className="text-sm text-[#68716a]">
            Fetching Delhi&apos;s forecast…
          </p>
        </div>
      ) : error || chartData.length === 0 ? (
        <div className="flex h-[280px] flex-col items-center justify-center rounded-lg bg-[#F8FAF7] px-6 text-center">
          <p className="text-sm font-semibold text-[#172019]">
            Forecast unavailable
          </p>
          <p className="mt-2 max-w-md text-xs leading-5 text-[#68716a]">
            {error ??
              "No forecast values are available between 08:00 and 16:00."}
          </p>
          <p className="mt-2 text-[10px] text-[#7a827c]">
            Simulated values are not substituted for missing live data.
          </p>
        </div>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
            >
              <ReferenceArea
                x1="09:30"
                x2="12:15"
                y1={0}
                y2={chartMax}
                fill="#f4a261"
                fillOpacity={0.1}
              />

              <ReferenceArea
                x1="13:00"
                x2="15:45"
                y1={0}
                y2={chartMax}
                fill="#78b98a"
                fillOpacity={0.08}
              />

              <CartesianGrid
                stroke="#e9eeea"
                strokeDasharray="2 4"
                vertical={false}
              />

              <XAxis
                dataKey="time"
                interval={3}
                tick={{ fontSize: 11, fill: "#69736c" }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                domain={[0, chartMax]}
                tick={{ fontSize: 11, fill: "#69736c" }}
                axisLine={false}
                tickLine={false}
                width={42}
                label={{
                  value: "PM2.5 µg/m³",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#69736c",
                  fontSize: 10,
                }}
              />

              <Tooltip
                contentStyle={{
                  border: "1px solid #dfe6df",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [
                  `${value} µg/m³`,
                  "Forecast PM2.5",
                ]}
                labelFormatter={(label) => `Time: ${label}`}
              />

              <ReferenceLine
                y={35}
                stroke="#e59b59"
                strokeDasharray="5 5"
                label={{
                  value: "Illustrative reference",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#b87536",
                }}
              />

              <Line
                type="monotone"
                dataKey="pm25"
                stroke="#1597d3"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-1 flex flex-wrap justify-between gap-2 text-[10px] font-medium uppercase tracking-wide">
        <span className="text-[#1597d3]">
          {chartData.length > 0
            ? `Forecast · ${chartData[0].time}–${chartData[chartData.length - 1].time}`
            : "Forecast not loaded"}
        </span>
        <span className="text-[#e97832]">
          Shaded morning period
        </span>
        <span className="text-[#3c9660]">
          Shaded afternoon period
        </span>
      </div>

      <div className="mt-5 border-t border-[#e8ece9] pt-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#7a827c]">
          Scheduled outdoor activities
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {chartActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-2 rounded-md bg-[#F8FAF7] px-3 py-2"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  activity.status === "elevated"
                    ? "bg-[#e97832]"
                    : "bg-[#3c9660]"
                }`}
              />

              <div>
                <p className="text-xs font-medium text-[#172019]">
                  {activity.name}
                </p>
                <p className="mt-0.5 text-[10px] text-[#7a827c]">
                  {activity.time}–{activity.end}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-[#edf0ed] pt-3 text-[11px] leading-5 text-[#7a827c]">
        PM2.5 values are modelled forecasts, not live measurements from
        a local monitoring station. The 35 µg/m³ line is an illustrative
        planning reference, not a validated school safety standard.
        Activity classifications remain demo labels and are not yet
        dynamically derived from the forecast.
      </div>
    </section>
  );
}

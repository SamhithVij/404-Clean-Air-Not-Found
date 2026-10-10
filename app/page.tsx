
"use client";

import { useEffect, useRef, useState } from "react";
import DayAtGlance from "./components/day-at-glance";
import MorningBriefing from "./components/morning-briefing";
import OutdoorSchedule from "./components/outdoor-schedule";
import { activities } from "./data/demo-school";
import { useAirQuality } from "./hooks/use-air-quality";
import {
  classifyActivityAirQuality,
  findBestFeasibleWindow,
  getAveragePm25,
  ILLUSTRATIVE_PM25_THRESHOLD,
} from "./lib/recommendations";

function getIndiaDate() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

function getMinutes(time: string) {
  const clock = time.includes("T") ? time.slice(11, 16) : time.slice(0, 5);
  const [hours, minutes] = clock.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatForecastDate(date: string | null) {
  if (!date) return null;

  const parsed = new Date(`${date}T12:00:00+05:30`);

  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export default function Home() {
  const {
    forecast,
    forecastDate,
    loading,
    error,
    source,
    location,
  } = useAirQuality();

  const [today, setToday] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDate = () => setToday(getIndiaDate());

    updateDate();

    const interval = window.setInterval(updateDate, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  // Preserve the existing 1100 ms scroll animation and easing.
  const scrollToSchedule = () => {
    const target = document.getElementById("outdoor-schedule");
    if (!target) return;

    const startY = window.scrollY;
    const targetY = target.getBoundingClientRect().top + window.scrollY;
    const distance = targetY - startY;
    const duration = 1100;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;

      const progress = Math.min((timestamp - startTime) / duration, 1);

      const eased =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      window.scrollTo(0, startY + distance * eased);

      if (progress < 1) {
        window.requestAnimationFrame(animate);
      }
    };

    window.requestAnimationFrame(animate);
  };

  const schoolDayForecast = forecast.filter((point) => {
    const minutes = getMinutes(point.time);
    return minutes >= 8 * 60 && minutes <= 15 * 60 + 45;
  });

  const schoolDayValues = schoolDayForecast
    .map((point) => point.pm25)
    .filter((value) => Number.isFinite(value));

  const schoolDayAverage =
    schoolDayValues.length > 0
      ? Math.round(
          (schoolDayValues.reduce((sum, value) => sum + value, 0) /
            schoolDayValues.length) *
            10
        ) / 10
      : null;

  const schoolDayMin =
    schoolDayValues.length > 0
      ? Math.round(Math.min(...schoolDayValues))
      : null;

  const schoolDayMax =
    schoolDayValues.length > 0
      ? Math.round(Math.max(...schoolDayValues))
      : null;

  const peakPoint =
    schoolDayForecast.length > 0
      ? schoolDayForecast.reduce((peak, point) =>
          point.pm25 > peak.pm25 ? point : peak
        )
      : null;

  const activitiesToDisplay = activities.filter(
    (activity) => activity.id !== "pe-8"
  );

  const elevatedMovableActivities =
    !loading && !error && forecast.length > 0
      ? activitiesToDisplay.filter((activity) => {
          const classification = classifyActivityAirQuality(
            activity,
            forecast
          );

          return activity.movable && classification.elevated === true;
        })
      : [];

  const activitiesWithFeasibleOptions =
    !loading && !error && forecast.length > 0
      ? elevatedMovableActivities.filter((activity) => {
          const currentPm25 = getAveragePm25(
            activity.time,
            activity.end,
            forecast
          );

          if (currentPm25 === null) return false;

          return Boolean(
            findBestFeasibleWindow(
              activity,
              forecast,
              activities,
              currentPm25
            )
          );
        })
      : [];

  const forecastAvailable =
    !loading && !error && schoolDayAverage !== null;

  const elevatedSchoolDay =
    forecastAvailable &&
    schoolDayAverage >= ILLUSTRATIVE_PM25_THRESHOLD;

  const forecastDateLabel = formatForecastDate(forecastDate);

  return (
    <>
      <MorningBriefing
        schoolName="Greenfield School"
        reviewCount={
          loading || error || forecast.length === 0
            ? null
            : elevatedMovableActivities.length
        }
        loading={loading}
        onContinue={() => {}}
      />

      <main className="min-h-screen bg-[#F5F8F6] text-[#172019]">
        <header className="border-b border-[#DDE4DE] bg-white">
          <div className="mx-auto flex min-h-[76px] max-w-[1200px] items-center justify-between gap-4 px-6">
            <div className="flex items-center gap-3">
              <svg
                width="38"
                height="38"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M9 25.5L16 11L23 25.5"
                  stroke="#F07828"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 25.5H29C33 25.5 35 22.8 35 19.5C35 16.2 32.4 13.5 29 13.5C27.9 13.5 26.9 13.8 26 14.3"
                  stroke="#087FC1"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 25.5C5.7 25.5 4 27.5 4 30C4 32.5 6 34 9 34H29C32 34 34 32 34 29"
                  stroke="#087FC1"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <div>
                <div className="text-xl font-semibold tracking-tight">
                  Airwise
                </div>
                <div className="text-[10px] tracking-[0.12em] text-[#657168]">
                  SCHOOL AIR QUALITY INTELLIGENCE
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-right text-xs">
                <div className="font-semibold">
                  TODAY{today ? ` · ${today}` : ""}
                </div>
                <div className="mt-1 text-[#657168]">
                  GREENFIELD SCHOOL
                </div>
              </div>

              {/* Replay the intro whenever requested */}
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new Event("airwise:show-intro"))
                }
                className="hidden rounded-full border border-[#DDE4DE] bg-white px-4 py-2 text-sm font-medium text-[#46544C] transition hover:bg-[#F5F8F6] focus:outline-none focus:ring-2 focus:ring-[#087FC1] sm:inline-flex"
              >
                Replay intro ↗
              </button>

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-label="Open administrator profile menu"
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#087FC1] text-sm font-semibold text-white shadow-sm transition hover:bg-[#066BA4] focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2"
                >
                  SA
                </button>

                {profileOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-[#E0E9E4] bg-white p-2 shadow-xl"
                  >
                    <div className="border-b border-[#E8ECE8] px-3 py-3">
                      <p className="text-sm font-semibold text-[#172019]">
                        School Administrator
                      </p>
                      <p className="mt-1 text-xs text-[#657168]">
                        Greenfield School
                      </p>
                    </div>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-[#172019] transition hover:bg-[#F5F8F6]"
                    >
                      <span>Profile</span>
                      <span className="text-xs text-[#657168]">
                        Admin
                      </span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-[#172019] transition hover:bg-[#F5F8F6]"
                    >
                      <span>Settings</span>
                      <span className="rounded-full bg-[#F5F8F6] px-2 py-0.5 text-[10px] font-medium text-[#657168]">
                        Soon
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1200px] px-6">
          <section className="relative mt-8 overflow-hidden rounded-3xl border border-[#E0E9E4] bg-gradient-to-br from-[#E8F5FC] via-white to-[#FFF1E6] px-7 py-9 sm:px-10 sm:py-12 lg:mt-10 lg:px-12 lg:py-14">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(310px,0.75fr)]">
              <div>
                <div
                  className={`mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    loading || error || !forecastAvailable
                      ? "bg-white/80 text-[#59645C]"
                      : elevatedSchoolDay
                        ? "bg-[#FFF0E5] text-[#A6531D]"
                        : "bg-[#EAF5ED] text-[#216E49]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      loading || error || !forecastAvailable
                        ? "bg-[#7A837C]"
                        : elevatedSchoolDay
                          ? "bg-[#F07828]"
                          : "bg-[#278A5B]"
                    }`}
                  />
                  {loading
                    ? "LOADING SCHOOL-DAY FORECAST"
                    : error || !forecastAvailable
                      ? "SCHOOL-DAY FORECAST UNAVAILABLE"
                      : elevatedSchoolDay
                        ? "ELEVATED FORECAST · REVIEW ACTIVITIES"
                        : "SCHOOL-DAY FORECAST · BELOW DEMO REFERENCE"}
                </div>

                <h1 className="max-w-[650px] text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-[#172019] sm:text-5xl lg:text-[56px]">
                  Know what needs attention today.
                </h1>

                <p className="mt-5 max-w-[620px] text-base leading-7 text-[#46544C] sm:text-lg sm:leading-8">
                  See which outdoor activities overlap with elevated air
                  pollution and identify lower-exposure windows to consider
                  before adjusting the school timetable.
                </p>

                {forecastAvailable && (
                  <div className="mt-6 flex flex-wrap gap-3 text-sm">
                    <a
                      href="#outdoor-schedule"
                      onClick={(event) => {
                        event.preventDefault();
                        scrollToSchedule();
                      }}
                      className="rounded-xl border border-white/90 bg-white/75 px-4 py-3 transition hover:border-[#F07828] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2"
                      aria-label={`Review ${elevatedMovableActivities.length} movable activities`}
                    >
                      <p className="text-xs text-[#657168]">
                        Movable activities to review
                      </p>
                      <p className="mt-1 text-xl font-semibold text-[#A6531D]">
                        {elevatedMovableActivities.length}
                      </p>
                      <p className="mt-1 text-xs font-medium text-[#087FC1]">
                        Review activities →
                      </p>
                    </a>

                    <a
                      href="#outdoor-schedule"
                      onClick={(event) => {
                        event.preventDefault();
                        scrollToSchedule();
                      }}
                      className="rounded-xl border border-white/90 bg-white/75 px-4 py-3 transition hover:border-[#087FC1] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2"
                      aria-label={`View ${activitiesWithFeasibleOptions.length} activities with feasible alternatives`}
                    >
                      <p className="text-xs text-[#657168]">
                        With a feasible alternative
                      </p>
                      <p className="mt-1 text-xl font-semibold text-[#087FC1]">
                        {activitiesWithFeasibleOptions.length}
                      </p>
                      <p className="mt-1 text-xs font-medium text-[#087FC1]">
                        View schedule →
                      </p>
                    </a>
                  </div>
                )}

                <a
                  href="#outdoor-schedule"
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToSchedule();
                  }}
                  className="mt-7 inline-flex items-center justify-center gap-2 rounded-lg bg-[#087FC1] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#066BA4] focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2"
                >
                  Review outdoor activities
                  <span aria-hidden="true">→</span>
                </a>

                <p className="mt-4 text-xs leading-5 text-[#657168]">
                  Planning support, not an automatic decision. School staff
                  remain responsible for the final timetable.
                </p>
              </div>

              <aside className="rounded-2xl border border-white/90 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#657168]">
                      SCHOOL-DAY AVERAGE
                    </p>
                    <h2 className="mt-2 text-lg font-semibold text-[#172019]">
                      PM2.5 forecast
                    </h2>
                  </div>

                  <span className="rounded-md bg-[#E8F5FC] px-2.5 py-1 text-[10px] font-semibold text-[#087FC1]">
                    MODELLED
                  </span>
                </div>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-5xl font-semibold tracking-[-0.05em] text-[#172019]">
                    {loading
                      ? "…"
                      : forecastAvailable
                        ? Math.round(schoolDayAverage)
                        : "—"}
                  </span>
                  <span className="text-sm text-[#657168]">µg/m³</span>
                </div>

                <p
                  className={`mt-4 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    loading || error || !forecastAvailable
                      ? "bg-[#F5F8F6] text-[#59645C]"
                      : elevatedSchoolDay
                        ? "bg-[#FFF1E6] text-[#A6531D]"
                        : "bg-[#EAF5ED] text-[#216E49]"
                  }`}
                >
                  {loading
                    ? "Loading forecast data…"
                    : error || !forecastAvailable
                      ? "No usable school-day forecast is available."
                      : elevatedSchoolDay
                        ? `Average is at or above the illustrative ${ILLUSTRATIVE_PM25_THRESHOLD} µg/m³ reference.`
                        : `Average is below the illustrative ${ILLUSTRATIVE_PM25_THRESHOLD} µg/m³ reference.`}
                </p>

                <div className="mt-5 space-y-3 border-t border-[#E8ECE8] pt-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#657168]">School hours</span>
                    <span className="font-medium text-[#172019]">
                      08:00–15:45 IST
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#657168]">Forecast range</span>
                    <span className="font-medium text-[#172019]">
                      {forecastAvailable
                        ? `${schoolDayMin}–${schoolDayMax} µg/m³`
                        : "Unavailable"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[#657168]">Highest forecast</span>
                    <span className="font-medium text-[#172019]">
                      {forecastAvailable && peakPoint
                        ? `${Math.round(peakPoint.pm25)} µg/m³ · ${peakPoint.time.slice(0, 5)}`
                        : "Unavailable"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 rounded-lg bg-[#F5F8F6] p-3">
                  <p className="text-xs leading-5 text-[#59645C]">
                    {location ? `${location} · ` : ""}
                    {source ?? "Open-Meteo forecast"}
                  </p>

                  {forecastDateLabel && (
                    <p className="mt-1 text-xs text-[#657168]">
                      Forecast date: {forecastDateLabel}
                    </p>
                  )}

                  <p className="mt-2 text-xs leading-5 text-[#657168]">
                    Forecast estimates, not local sensor readings. The
                    illustrative reference is not a validated school safety
                    standard.
                  </p>
                </div>
              </aside>
            </div>
          </section>

          <div className="my-8 h-px bg-gradient-to-r from-[#087FC1] via-[#4689B8] to-[#F07828]" />

          <div id="day-at-a-glance" className="scroll-mt-6">
            <DayAtGlance />
          </div>

          <div id="outdoor-schedule" className="scroll-mt-6">
            <OutdoorSchedule />
          </div>
        </div>
      </main>
    </>
  );
}


"use client";

import { useState } from "react";
import { activities as initialActivities } from "../data/demo-school";
import { useAirQuality } from "../hooks/use-air-quality";
import {
  findBestFeasibleWindow,
  generateCandidateWindows,
  getAveragePm25 as calculateAveragePm25,
  evaluateWindow,
} from "../lib/recommendations";

type Activity = (typeof initialActivities)[number];

type ScheduledTime = {
  time: string;
  end: string;
};

export default function OutdoorSchedule() {
  const {
    forecast,
    loading,
    error,
    source,
    fetchedAt,
    location,
  } = useAirQuality();

  const [activities, setActivities] = useState<Activity[]>(initialActivities);

  const [originalSchedule] = useState<Record<string, ScheduledTime>>(() =>
    Object.fromEntries(
      initialActivities.map((activity) => [
        activity.id,
        { time: activity.time, end: activity.end },
      ])
    )
  );

  const [acceptedTimes, setAcceptedTimes] = useState<
    Record<string, ScheduledTime>
  >({});

  const [selectedId, setSelectedId] = useState("pe-5-6");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [acceptedMessage, setAcceptedMessage] = useState("");

  const activitiesToDisplay = activities.filter(
    (activity) => activity.id !== "pe-8"
  );

  const selectedActivity =
    activitiesToDisplay.find((activity) => activity.id === selectedId) ??
    activitiesToDisplay[0];

  const originalTime = originalSchedule[selectedActivity.id];
  const acceptedTime = acceptedTimes[selectedActivity.id];

  const activitiesToReview = activitiesToDisplay.filter(
    (activity) => activity.status === "elevated"
  );

  function getActivityAverage(activity: Activity): number | null {
    if (forecast.length === 0) return null;

    return calculateAveragePm25(
      activity.time,
      activity.end,
      forecast
    );
  }

  function getRecommendation(activity: Activity) {
    if (loading || error || forecast.length === 0) return null;
    if (acceptedTimes[activity.id]) return null;

    if (!activity.movable || activity.status !== "elevated") {
      return null;
    }

    const currentPm25 = getActivityAverage(activity);

    if (currentPm25 === null) return null;

    return findBestFeasibleWindow(
      activity,
      forecast,
      activities,
      currentPm25
    );
  }

  const bestWindow = getRecommendation(selectedActivity);

  const candidateWindows =
    !loading && !error && forecast.length > 0 &&
    selectedActivity.status === "elevated"
      ? generateCandidateWindows(selectedActivity, forecast)
      : [];

  const rejectedWindows =
    !loading &&
    !error &&
    forecast.length > 0 &&
    selectedActivity.status === "elevated" &&
    !acceptedTime
      ? candidateWindows
          .filter((window) => {
            const currentPm25 = getActivityAverage(selectedActivity);

            return (
              currentPm25 !== null &&
              window.pm25 < currentPm25
            );
          })
          .map((window) =>
            evaluateWindow(
              selectedActivity,
              window.start,
              window.end,
              window.pm25,
              activities
            )
          )
          .filter((window) => !window.feasible)
          .sort((a, b) => a.pm25 - b.pm25)
          .slice(0, 3)
      : [];

  function acceptProposedTime() {
    if (!bestWindow || acceptedTimes[selectedActivity.id]) return;

    const activityId = selectedActivity.id;
    const activityName = selectedActivity.name;
    const proposedStart = bestWindow.start;
    const proposedEnd = bestWindow.end;

    setAcceptedTimes((previous) => ({
      ...previous,
      [activityId]: {
        time: proposedStart,
        end: proposedEnd,
      },
    }));

    setActivities((previous) =>
      previous.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              time: proposedStart,
              end: proposedEnd,
            }
          : activity
      )
    );

    setAcceptedMessage(
      `${activityName} moved to ${proposedStart}–${proposedEnd} for this demo session.`
    );

    setReviewOpen(false);
  }

  function revertToOriginalTime() {
    const activityId = selectedActivity.id;
    const activityName = selectedActivity.name;
    const original = originalSchedule[activityId];

    if (!original || !acceptedTimes[activityId]) return;

    setActivities((previous) =>
      previous.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              time: original.time,
              end: original.end,
            }
          : activity
      )
    );

    setAcceptedTimes((previous) => {
      const next = { ...previous };
      delete next[activityId];
      return next;
    });

    setAcceptedMessage(
      `${activityName} restored to ${original.time}–${original.end}.`
    );

    setReviewOpen(false);
  }

  function currentSelectedAverage() {
    const average = getActivityAverage(selectedActivity);
    return average === null ? "Unavailable" : `${average} µg/m³`;
  }

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
    <>
      <section className="mt-10 grid grid-cols-1 gap-6 pb-16 lg:grid-cols-[minmax(0,1.8fr)_minmax(340px,0.9fr)]">
        <div className="overflow-hidden rounded-xl border border-[#DDE4DE] bg-white">
          <div className="border-b border-[#E8ECE8] px-7 py-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#59645C]">
              Your outdoor schedule
            </p>

            <div className="mt-2 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-medium tracking-tight text-[#172019]">
                Six activities. One school day.
              </h2>
              <span className="shrink-0 text-xs text-[#E47B38]">
                {activitiesToReview.length} to review
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[#59645C]">
              {loading ? (
                <span className="rounded-full bg-[#F8F3E8] px-2 py-1">
                  Loading forecast…
                </span>
              ) : error ? (
                <span className="rounded-full bg-[#FFF0E8] px-2 py-1 text-[#B75B2A]">
                  Live forecast unavailable
                </span>
              ) : (
                <>
                  <span className="rounded-full bg-[#EEF7F0] px-2 py-1 font-semibold text-[#278A5B]">
                    Live forecast
                  </span>
                  <span>{location}</span>
                  {source && <span>· {source}</span>}
                  {formattedFetchTime && (
                    <span>· Fetched {formattedFetchTime} IST</span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="hidden grid-cols-[90px_1.8fr_1.2fr_1.1fr] gap-5 border-b border-[#E8ECE8] px-7 py-3 text-[9px] font-semibold uppercase tracking-wider text-[#7A827C] sm:grid">
            <span>Time</span>
            <span>Activity / status</span>
            <span>Forecast PM2.5</span>
            <span>Lower-exposure option</span>
          </div>

          <div>
            {activitiesToDisplay.map((activity) => {
              const isSelected = activity.id === selectedId;
              const recommendation = getRecommendation(activity);
              const currentPm25 = getActivityAverage(activity);
              const accepted = acceptedTimes[activity.id];

              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(activity.id);
                    setAcceptedMessage("");
                  }}
                  className={`grid w-full grid-cols-1 gap-3 border-b border-[#E8ECE8] px-7 py-5 text-left last:border-b-0 sm:grid-cols-[90px_1.8fr_1.2fr_1.1fr] sm:gap-5 ${
                    isSelected
                      ? "bg-[#FFF7F0]"
                      : "bg-white hover:bg-[#FAFCFA]"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-[#172019]">
                      {activity.time}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#8A918B]">
                      → {activity.end}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#172019]">
                      {activity.name}
                    </p>
                    <p className="mt-1 text-[11px] text-[#7A827C]">
                      {activity.detail}
                    </p>
                    <p
                      className={`mt-2 text-[11px] font-medium ${
                        accepted
                          ? "text-[#278A5B]"
                          : activity.status === "elevated"
                            ? "text-[#E47B38]"
                            : "text-[#278A5B]"
                      }`}
                    >
                      •{" "}
                      {accepted
                        ? "Rescheduled this session"
                        : activity.status === "elevated"
                          ? "Review timing"
                          : "Seeded demo status"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-[#172019]">
                      {loading
                        ? "Loading…"
                        : currentPm25 === null
                          ? "Unavailable"
                          : `${currentPm25} µg/m³`}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#7A827C]">
                      {currentPm25 === null
                        ? "No forecast values for this time"
                        : currentPm25 >= 35
                          ? "Above illustrative reference"
                          : "Below illustrative reference"}
                    </p>
                  </div>

                  <div>
                    {accepted ? (
                      <>
                        <p className="text-sm font-semibold text-[#278A5B]">
                          Rescheduled
                        </p>
                        <p className="mt-1 text-xs text-[#59645C]">
                          {accepted.time}–{accepted.end}
                        </p>
                      </>
                    ) : recommendation ? (
                      <>
                        <p className="text-sm font-medium text-[#278A5B]">
                          {recommendation.start}–{recommendation.end}
                        </p>
                        <p className="mt-1 text-[10px] text-[#7A827C]">
                          {recommendation.pm25} µg/m³ estimated
                        </p>
                      </>
                    ) : loading ? (
                      <p className="text-sm text-[#7A827C]">
                        Calculating…
                      </p>
                    ) : error || forecast.length === 0 ? (
                      <p className="text-sm font-medium text-[#E47B38]">
                        Forecast unavailable
                      </p>
                    ) : activity.status === "elevated" ? (
                      <p className="text-sm font-medium text-[#E47B38]">
                        No feasible window
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-[#278A5B]">
                        No change suggested
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-7 py-5 text-[10px] leading-5 text-[#7A827C]">
            Forecast values are modelled estimates from the selected API,
            not local station measurements. Proposed slots preserve activity
            duration and check detected timetable conflicts.
          </div>
        </div>

        <aside className="rounded-xl border border-[#DDE4DE] bg-white p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7A827C]">
            Selected for review
          </p>

          <h2 className="mt-2 text-2xl font-medium tracking-tight text-[#172019]">
            {selectedActivity.name}
          </h2>

          <p className="mt-1 text-xs text-[#59645C]">
            {selectedActivity.time}–{selectedActivity.end} ·{" "}
            {selectedActivity.location}
          </p>

          <div className="mt-7 border-t border-[#E8ECE8] pt-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#E47B38]">
              Demo activity classification
            </p>
            <p className="mt-2 text-sm leading-6 text-[#59645C]">
              {selectedActivity.status === "elevated"
                ? "This activity is flagged by the seeded demo timetable. Its forecast average below is calculated from the live forecast; the classification itself has not yet been made dynamic."
                : "This activity's seeded demo classification has not yet been recalculated from the live forecast."}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#8A918B]">
                  Forecast average
                </p>
                <p className="mt-1 text-xl font-medium text-[#172019]">
                  {loading ? "Loading…" : currentSelectedAverage()}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#8A918B]">
                  Illustrative reference
                </p>
                <p className="mt-1 text-xl font-medium text-[#172019]">
                  35 <span className="text-xs font-normal">µg/m³</span>
                </p>
              </div>
            </div>
          </div>

          {selectedActivity.status === "elevated" ? (
            <div className="mt-7 rounded-lg bg-[#EEF7F0] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#278A5B]">
                {acceptedTime
                  ? "Accepted schedule change"
                  : "Best feasible lower-exposure window"}
              </p>

              {acceptedTime ? (
                <>
                  <p className="mt-1 text-2xl font-medium text-[#172019]">
                    {acceptedTime.time}–{acceptedTime.end}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#59645C]">
                    Accepted for this demo session. The forecast average
                    reflects the new time; this does not establish that the
                    conditions are safe.
                  </p>
                </>
              ) : loading ? (
                <p className="mt-2 text-sm text-[#59645C]">
                  Waiting for live forecast…
                </p>
              ) : error || forecast.length === 0 ? (
                <p className="mt-2 text-sm leading-6 text-[#59645C]">
                  A recommendation cannot be calculated because the live
                  forecast is unavailable.
                </p>
              ) : bestWindow ? (
                <>
                  <p className="mt-1 text-2xl font-medium text-[#172019]">
                    {bestWindow.start}–{bestWindow.end}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#59645C]">
                    Estimated average PM2.5:{" "}
                    <span className="font-medium">
                      {bestWindow.pm25} µg/m³
                    </span>
                    . No detected timetable conflicts.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm leading-6 text-[#59645C]">
                  No lower-exposure window without a detected timetable
                  conflict was found during school hours.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-7 rounded-lg bg-[#F3F7F3] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#278A5B]">
                Current timing
              </p>
              <p className="mt-1 text-sm leading-6 text-[#59645C]">
                No timing change is currently suggested by the demo
                classification.
              </p>
            </div>
          )}

          {acceptedMessage && (
            <p
              role="status"
              className="mt-4 rounded-md bg-[#EEF7F0] p-3 text-xs leading-5 text-[#278A5B]"
            >
              {acceptedMessage}
            </p>
          )}

          <div className="mt-6">
            {selectedActivity.status === "elevated" &&
              selectedActivity.movable && (
                <button
                  type="button"
                  disabled={
                    loading ||
                    Boolean(error) ||
                    forecast.length === 0 ||
                    (!acceptedTime && !bestWindow)
                  }
                  onClick={() => setReviewOpen(true)}
                  className="rounded-md bg-[#278A5B] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#20774E] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {acceptedTime
                    ? "View accepted change →"
                    : "Review proposed time →"}
                </button>
              )}
          </div>
        </aside>
      </section>

      {reviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#101812]/55 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setReviewOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-modal-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#DDE4DE] bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#278A5B]">
                  Scheduling review
                </p>
                <h2
                  id="review-modal-title"
                  className="mt-2 text-2xl font-bold tracking-tight text-[#172019]"
                >
                  {acceptedTime
                    ? "Accepted schedule change"
                    : "Review proposed time"}
                </h2>
                <p className="mt-1 text-sm font-medium text-[#59645C]">
                  {selectedActivity.name} ·{" "}
                  {selectedActivity.durationMinutes}-minute activity
                </p>
              </div>

              <button
                type="button"
                aria-label="Close review"
                onClick={() => setReviewOpen(false)}
                className="rounded-md border border-[#DDE4DE] px-3 py-2 text-sm text-[#59645C] hover:bg-[#F6F8F6]"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#E8ECE8] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#7A827C]">
                  Original scheduled time
                </p>
                <p className="mt-2 text-2xl font-bold text-[#172019]">
                  {originalTime.time}–{originalTime.end}
                </p>
                <p className="mt-1 text-sm font-medium text-[#59645C]">
                  {calculateAveragePm25(
                    originalTime.time,
                    originalTime.end,
                    forecast
                  ) ?? "Unavailable"}{" "}
                  {calculateAveragePm25(
                    originalTime.time,
                    originalTime.end,
                    forecast
                  ) === null
                    ? ""
                    : "µg/m³ average PM2.5"}
                </p>
              </div>

              <div
                className={`rounded-lg border p-4 ${
                  acceptedTime || bestWindow
                    ? "border-[#BFDCC7] bg-[#EEF7F0]"
                    : "border-[#E8ECE8] bg-[#F8FAF7]"
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-[#59645C]">
                  {acceptedTime ? "Accepted time" : "Proposed time"}
                </p>

                {acceptedTime ? (
                  <>
                    <p className="mt-2 text-2xl font-bold text-[#172019]">
                      {acceptedTime.time}–{acceptedTime.end}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#278A5B]">
                      Accepted for this demo session.
                    </p>
                  </>
                ) : bestWindow ? (
                  <>
                    <p className="mt-2 text-2xl font-bold text-[#172019]">
                      {bestWindow.start}–{bestWindow.end}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#278A5B]">
                      {bestWindow.pm25} µg/m³ estimated average PM2.5
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-base font-semibold leading-6 text-[#59645C]">
                    No feasible lower-exposure window found.
                  </p>
                )}
              </div>
            </div>

            {!acceptedTime && (
              <div className="mt-6">
                <h3 className="text-base font-bold text-[#172019]">
                  Lower-exposure alternatives rejected
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#59645C]">
                  These windows have lower estimated PM2.5 but conflict with
                  the current demo timetable.
                </p>

                {rejectedWindows.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {rejectedWindows.map((window) => (
                      <div
                        key={`${window.start}-${window.end}`}
                        className="rounded-lg border border-[#E8ECE8] p-4"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-base font-bold text-[#172019]">
                            {window.start}–{window.end}
                          </p>
                          <p className="text-sm font-semibold text-[#59645C]">
                            {window.pm25} µg/m³
                          </p>
                        </div>

                        <div className="mt-2 space-y-1">
                          {window.conflicts.map((conflict, index) => (
                            <p
                              key={`${conflict.activityId}-${conflict.type}-${index}`}
                              className="text-sm font-medium leading-6 text-[#59645C]"
                            >
                              <span className="mr-1 font-bold text-[#E47B38]">
                                Conflict:
                              </span>
                              {conflict.reason}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-[#F8FAF7] p-4 text-sm font-medium text-[#59645C]">
                    No lower-exposure conflicting windows were found.
                  </p>
                )}
              </div>
            )}

            <p className="mt-5 text-sm leading-6 text-[#7A827C]">
              This forecast is modelled data, not a local station measurement.
              Changes apply only to this demo session and reset on refresh.
              The administrator remains responsible for the final decision.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#E8ECE8] pt-5 sm:flex-row sm:justify-end">
              {acceptedTime ? (
                <>
                  <button
                    type="button"
                    onClick={() => setReviewOpen(false)}
                    className="rounded-md border border-[#DDE4DE] px-4 py-3 text-sm font-semibold text-[#59645C] hover:bg-[#F6F8F6]"
                  >
                    Keep current time
                  </button>

                  <button
                    type="button"
                    onClick={revertToOriginalTime}
                    className="rounded-md bg-[#E47B38] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C9672B]"
                  >
                    Revert to original time
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setReviewOpen(false)}
                    className="rounded-md border border-[#DDE4DE] px-4 py-3 text-sm font-semibold text-[#59645C] hover:bg-[#F6F8F6]"
                  >
                    Keep original time
                  </button>

                  <button
                    type="button"
                    disabled={!bestWindow}
                    onClick={acceptProposedTime}
                    className="rounded-md bg-[#278A5B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#20774E] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Accept proposed time
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

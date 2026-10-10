"use client";
import { useState } from "react";
import { activities as initialActivities } from "../data/demo-school";
import { useAirQuality } from "../hooks/use-air-quality";
import {
  findBestFeasibleWindow,
  generateCandidateWindows,
  getAveragePm25 as calculateAveragePm25,
  evaluateWindow,
  classifyActivityAirQuality,
  ILLUSTRATIVE_PM25_THRESHOLD,
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

  // Always evaluate proposals against the latest accepted timetable.
  // acceptedTimes is the source of truth for accepted moves, even if the
  // activity list and accepted-time state are ever updated independently.
  const currentTimetable = activities.map((activity) => {
    const accepted = acceptedTimes[activity.id];

    return accepted
      ? { ...activity, time: accepted.time, end: accepted.end }
      : activity;
  });

  function formatPm25(value: number | null | undefined): string {
    return value == null ? "Unavailable" : value.toFixed(1);
  }

  function getClassification(activity: Activity) {
    if (loading || error || forecast.length === 0) return null;

    return classifyActivityAirQuality(activity, forecast);
  }

  function isElevated(activity: Activity): boolean {
    return getClassification(activity)?.elevated === true;
  }

  const activitiesToReview = activitiesToDisplay.filter(
    (activity) => activity.movable && isElevated(activity)
  );

  function getActivityAverage(activity: Activity): number | null {
    if (forecast.length === 0 || loading || error) return null;

    return calculateAveragePm25(activity.time, activity.end, forecast);
  }

  function getRecommendation(activity: Activity) {
    if (loading || error || forecast.length === 0) return null;
    if (acceptedTimes[activity.id]) return null;
    if (!activity.movable || !isElevated(activity)) return null;

    const currentPm25 = getActivityAverage(activity);

    if (currentPm25 === null) return null;

    return findBestFeasibleWindow(
      activity,
      forecast,
      currentTimetable,
      currentPm25
    );
  }

  const bestWindow = getRecommendation(selectedActivity);
  const selectedClassification = getClassification(selectedActivity);
  const selectedIsElevated = isElevated(selectedActivity);

  const candidateWindows =
    !loading &&
    !error &&
    forecast.length > 0 &&
    selectedIsElevated
      ? generateCandidateWindows(selectedActivity, forecast)
      : [];

  const rejectedWindows =
    !loading &&
    !error &&
    forecast.length > 0 &&
    selectedIsElevated &&
    !acceptedTime
      ? candidateWindows
          .filter((window) => {
            const currentPm25 = getActivityAverage(selectedActivity);

            return currentPm25 !== null && window.pm25 < currentPm25;
          })
          .map((window) =>
            evaluateWindow(
              selectedActivity,
              window.start,
              window.end,
              window.pm25,
              currentTimetable
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

    return average === null
      ? "Unavailable"
      : `${formatPm25(average)} µg/m³`;
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
        <div className="overflow-hidden rounded-2xl border border-[#DDE4DE] bg-white shadow-sm">
          <div className="border-b border-[#E8ECE8] px-7 py-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#46544C]">
              Your outdoor schedule
            </p>

            <div className="mt-2 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-medium tracking-tight text-[#172019]">
                Six activities. One school day.
              </h2>

              <span className="shrink-0 text-xs text-[#A6531D]">
                {loading
                  ? "Checking forecast…"
                  : error
                    ? "Forecast unavailable"
                    : `${activitiesToReview.length} to review`}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-[#46544C]">
              {loading ? (
                <span className="rounded-full bg-[#F8F3E8] px-2 py-1">
                  Loading forecast…
                </span>
              ) : error ? (
                <span className="rounded-full bg-[#FFF1E6] px-2 py-1 text-[#A6531D]">
                  Live forecast unavailable
                </span>
              ) : (
                <>
                  <span className="rounded-full bg-[#EAF5ED] px-2 py-1 font-semibold text-[#216E49]">
                    Forecast API connected
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

          <div className="hidden grid-cols-[90px_1.8fr_1.2fr_1.1fr] gap-5 border-b border-[#E8ECE8] px-7 py-3 text-[9px] font-semibold uppercase tracking-wider text-[#657168] sm:grid">
            <span>Time</span>
            <span>Activity / forecast status</span>
            <span>Estimated activity average</span>
            <span>Lower-exposure option</span>
          </div>

          <div>
            {activitiesToDisplay.map((activity) => {
              const isSelected = activity.id === selectedId;
              const recommendation = getRecommendation(activity);
              const currentPm25 = getActivityAverage(activity);
              const classification = getClassification(activity);
              const accepted = acceptedTimes[activity.id];
              const elevated = classification?.elevated === true;

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
                      ? "bg-[#FFF4EB] shadow-[inset_3px_0_0_#F07828]"
                      : "bg-white hover:bg-[#F8FAF7]"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-[#172019]">
                      {activity.time}
                    </p>

                    <p className="mt-0.5 text-[10px] text-[#657168]">
                      → {activity.end}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#172019]">
                      {activity.name}
                    </p>

                    <p className="mt-1 text-[11px] text-[#657168]">
                      {activity.detail}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {accepted ? (
                        <span className="rounded-full bg-[#EEF7F0] px-2 py-1 text-[10px] font-semibold text-[#216E49]">
                          Rescheduled
                        </span>
                      ) : !activity.movable ? (
                        <span className="rounded-full bg-[#F3F7F3] px-2 py-1 text-[10px] font-semibold text-[#46544C]">
                          Fixed · {elevated ? "above reference" : "below reference"}
                        </span>
                      ) : elevated ? (
                        <span className="rounded-full bg-[#FFF1E6] px-2 py-1 text-[10px] font-semibold text-[#A6531D]">
                          Review recommended
                        </span>
                      ) : classification ? (
                        <span className="rounded-full bg-[#F3F7F3] px-2 py-1 text-[10px] font-semibold text-[#46544C]">
                          {classification.label}
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#F3F7F3] px-2 py-1 text-[10px] font-semibold text-[#657168]">
                          Awaiting forecast
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#172019]">
                      {currentPm25 === null
                        ? "Unavailable"
                        : `${formatPm25(currentPm25)} µg/m³`}
                    </p>
                  </div>

                  <div>
                    {accepted ? (
                      <>
                        <p className="text-sm font-semibold text-[#216E49]">
                          {accepted.time}–{accepted.end}
                        </p>

                        <p className="mt-1 text-[10px] text-[#657168]">
                          Accepted for this demo
                        </p>
                      </>
                    ) : recommendation ? (
                      <>
                        <p className="text-sm font-semibold text-[#087FC1]">
                          {recommendation.start}–{recommendation.end}
                        </p>

                        <p className="mt-1 text-[10px] text-[#657168]">
                          {formatPm25(recommendation.pm25)} µg/m³ estimated average
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-[#657168]">
                        {loading
                          ? "Checking…"
                          : error
                            ? "Forecast unavailable"
                            : !activity.movable
                              ? "Fixed activity"
                              : elevated
                                ? "No feasible option found"
                                : "No change suggested"}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="rounded-2xl border border-[#DDE4DE] bg-white p-6 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#46544C]">
            Activity details
          </p>

          <h2 className="mt-2 text-2xl font-medium tracking-tight text-[#172019]">
            {selectedActivity.name}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#46544C]">
            {selectedActivity.detail}
          </p>

          <div className="mt-5 rounded-lg border border-[#E8ECE8] bg-[#F8FAF7] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#657168]">
              Current scheduled time
            </p>

            <p className="mt-2 text-2xl font-semibold text-[#172019]">
              {selectedActivity.time}–{selectedActivity.end}
            </p>

            <p className="mt-1 text-xs text-[#657168]">
              {selectedActivity.durationMinutes}-minute activity
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-[#E8ECE8] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#657168]">
              Estimated average PM2.5
            </p>

            <p className="mt-2 text-2xl font-semibold text-[#172019]">
              {currentSelectedAverage()}
            </p>

            <p className="mt-1 text-xs leading-5 text-[#657168]">
              Forecast-based estimate for the activity&apos;s scheduled time.
            </p>
          </div>

          {selectedClassification && (
            <div
              className={`mt-4 rounded-lg border p-4 ${
                selectedClassification.elevated
                  ? "border-[#F1D0BD] bg-[#FFF4EB]"
                  : "border-[#E8ECE8] bg-[#F8FAF7]"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[#657168]">
                Forecast status
              </p>

              <p
                className={`mt-2 text-base font-semibold ${
                  selectedClassification.elevated
                    ? "text-[#A6531D]"
                    : "text-[#46544C]"
                }`}
              >
                {selectedClassification.label}
              </p>

              <p className="mt-1 text-sm leading-6 text-[#46544C]">
                {selectedClassification.elevated
                  ? `This activity is above the illustrative PM2.5 planning reference of ${ILLUSTRATIVE_PM25_THRESHOLD.toFixed(1)} µg/m³. Review the available alternatives before making a timetable change.`
                  : `This activity is within the illustrative PM2.5 planning reference of ${ILLUSTRATIVE_PM25_THRESHOLD.toFixed(1)} µg/m³ for its current time. No change is suggested by this rule.`}
              </p>
            </div>
          )}

          {acceptedMessage && (
            <p
              role="status"
              className="mt-4 rounded-md bg-[#EAF5ED] p-3 text-xs leading-5 text-[#216E49]"
            >
              {acceptedMessage}
            </p>
          )}

          <div className="mt-6">
            {selectedIsElevated && selectedActivity.movable && (
              <button
                type="button"
                disabled={
                  loading ||
                  Boolean(error) ||
                  forecast.length === 0 ||
                  (!acceptedTime && !bestWindow)
                }
                onClick={() => setReviewOpen(true)}
                className="rounded-lg bg-[#087FC1] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#06699F] focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#172019]/55 p-4 backdrop-blur-[2px]"
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
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#087FC1]">
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

                <p className="mt-1 text-sm font-medium text-[#46544C]">
                  {selectedActivity.name} ·{" "}
                  {selectedActivity.durationMinutes}-minute activity
                </p>
              </div>

              <button
                type="button"
                aria-label="Close review"
                onClick={() => setReviewOpen(false)}
                className="rounded-lg border border-[#DDE4DE] px-3 py-2 text-sm text-[#46544C] transition hover:bg-[#F6F8F6] focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#E8ECE8] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#657168]">
                  Original scheduled time
                </p>

                <p className="mt-2 text-2xl font-bold text-[#172019]">
                  {originalTime.time}–{originalTime.end}
                </p>

                <p className="mt-1 text-sm font-medium text-[#46544C]">
                  {formatPm25(
                    calculateAveragePm25(
                      originalTime.time,
                      originalTime.end,
                      forecast
                    )
                  )}{" "}
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
                <p className="text-xs font-bold uppercase tracking-wider text-[#46544C]">
                  {acceptedTime ? "Accepted time" : "Proposed time"}
                </p>

                {acceptedTime ? (
                  <>
                    <p className="mt-2 text-2xl font-bold text-[#172019]">
                      {acceptedTime.time}–{acceptedTime.end}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#216E49]">
                      Accepted for this demo session.
                    </p>
                  </>
                ) : bestWindow ? (
                  <>
                    <p className="mt-2 text-2xl font-bold text-[#172019]">
                      {bestWindow.start}–{bestWindow.end}
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#087FC1]">
                      {formatPm25(bestWindow.pm25)} µg/m³ estimated average PM2.5
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-base font-semibold leading-6 text-[#46544C]">
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

                <p className="mt-1 text-sm leading-6 text-[#46544C]">
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

                          <p className="text-sm font-semibold text-[#46544C]">
                            {formatPm25(window.pm25)} µg/m³
                          </p>
                        </div>

                        <div className="mt-2 space-y-1">
                          {window.conflicts.map((conflict, index) => (
                            <p
                              key={`${conflict.activityId}-${conflict.type}-${index}`}
                              className="text-sm font-medium leading-6 text-[#46544C]"
                            >
                              <span className="mr-1 font-bold text-[#A6531D]">
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
                  <p className="mt-3 rounded-lg bg-[#F8FAF7] p-4 text-sm font-medium text-[#46544C]">
                    No lower-exposure conflicting windows were found.
                  </p>
                )}
              </div>
            )}

            <p className="mt-5 text-sm leading-6 text-[#657168]">
              This forecast is modelled data, not a local station measurement.
              Changes apply only to this demo session and reset on refresh.
              The administrator remains responsible for the final decision.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#E8ECE8] pt-5 sm:flex-row sm:justify-end">
              {acceptedTime ? (
                <>
                  <button
                    type="button"
                    onClick={revertToOriginalTime}
                    className="rounded-lg border border-[#E8C2A9] bg-white px-4 py-3 text-sm font-semibold text-[#A6531D] transition hover:bg-[#FFF8F3] focus:outline-none focus:ring-2 focus:ring-[#F07828] focus:ring-offset-2"
                  >
                    Revert to original time
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewOpen(false)}
                    className="rounded-lg bg-[#087FC1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#06699F] focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setReviewOpen(false)}
                    className="rounded-lg border border-[#DDE4DE] px-4 py-3 text-sm font-semibold text-[#46544C] transition hover:bg-[#F6F8F6] focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2"
                  >
                    Keep original time
                  </button>

                  <button
                    type="button"
                    disabled={!bestWindow}
                    onClick={acceptProposedTime}
                    className="rounded-lg bg-[#087FC1] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#06699F] focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
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
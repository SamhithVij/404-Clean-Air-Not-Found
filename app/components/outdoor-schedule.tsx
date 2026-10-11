
"use client";

import { useEffect, useState } from "react";
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

  const [aiExplanation, setAiExplanation] = useState<Record<string, string>>(
    {}
  );
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(true);

  const activitiesToDisplay = activities.filter(
    (activity) => activity.id !== "pe-8"
  );

  const selectedActivity =
    activitiesToDisplay.find((activity) => activity.id === selectedId) ??
    activitiesToDisplay[0];

  const originalTime = originalSchedule[selectedActivity.id] ?? {
    time: selectedActivity.time,
    end: selectedActivity.end,
  };

  const acceptedTime = acceptedTimes[selectedActivity.id];

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
      activities,
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

  async function generateAiExplanation() {
    const activity = selectedActivity;
    const averagePm25 = getActivityAverage(activity);

    if (averagePm25 === null || aiLoading) return;

    setAiLoading(true);
    setAiErrors((previous) => ({
      ...previous,
      [activity.id]: "",
    }));

    try {
      const accepted = acceptedTimes[activity.id];

      const alternative = accepted
        ? {
            start: accepted.time,
            end: accepted.end,
            averagePm25: calculateAveragePm25(
              accepted.time,
              accepted.end,
              forecast
            ),
          }
        : bestWindow
          ? {
              start: bestWindow.start,
              end: bestWindow.end,
              averagePm25: bestWindow.pm25,
            }
          : null;

      const response = await fetch("/api/bedrock-explanation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activityName: activity.name,
          activityDetail: activity.detail,
          startTime: activity.time,
          endTime: activity.end,
          averagePm25,
          threshold: ILLUSTRATIVE_PM25_THRESHOLD,
          alternative:
            alternative?.averagePm25 == null ? null : alternative,
        }),
      });

      const result = await response.json();

      if (!response.ok || typeof result.explanation !== "string") {
        throw new Error(
          result.error ?? "Could not generate an explanation."
        );
      }

      setAiExplanation((previous) => ({
        ...previous,
        [activity.id]: result.explanation,
      }));
    } catch (err) {
      setAiErrors((previous) => ({
        ...previous,
        [activity.id]:
          err instanceof Error
            ? err.message
            : "AI explanation is temporarily unavailable.",
      }));
    } finally {
      setAiLoading(false);
    }
  }

  function openReviewWithExplanation() {
    setReviewOpen(true);

    if (!aiExplanation[selectedActivity.id] && !aiLoading) {
      void generateAiExplanation();
    }
  }

  function currentSelectedAverage() {
    const average = getActivityAverage(selectedActivity);

    return average === null
      ? "Unavailable"
      : `${average.toFixed(1)} µg/m³`;
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

  // Close the dialog with Escape and lock background scrolling while open.
  useEffect(() => {
    if (!reviewOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setReviewOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [reviewOpen]);

  return (
    <>
      <section className="mt-10 grid grid-cols-1 gap-6 pb-16 lg:grid-cols-[minmax(0,1.8fr)_minmax(340px,0.9fr)]">
        {/* Schedule table */}
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
            <span>Forecast PM2.5</span>
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
                  className={`grid w-full grid-cols-1 gap-3 border-b border-[#E8ECE8] px-7 py-5 text-left last:border-b-0 transition-colors duration-200 sm:grid-cols-[90px_1.8fr_1.2fr_1.1fr] sm:gap-5 ${
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

                      {!activity.movable && (
                        <span className="text-[10px] text-[#657168]">
                          Fixed activity
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#172019]">
                      {currentPm25 === null
                        ? "Unavailable"
                        : `${currentPm25.toFixed(1)} µg/m³`}
                    </p>
                    <p className="mt-1 text-[10px] text-[#657168]">
                      Estimated activity average
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
                          {recommendation.pm25.toFixed(1)} µg/m³ estimated average
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

          <div className="border-t border-[#E8ECE8] px-7 py-4 text-[10px] leading-5 text-[#657168]">
            Forecast values are modelled estimates, not local station
            measurements. Recommendations preserve activity duration and check
            detected timetable conflicts.
          </div>
        </div>

        {/* Selected activity details */}
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
                  ? `This activity is above the illustrative PM2.5 planning reference of ${ILLUSTRATIVE_PM25_THRESHOLD} µg/m³. Review the available alternatives before making a timetable change.`
                  : `This activity is within the illustrative PM2.5 planning reference of ${ILLUSTRATIVE_PM25_THRESHOLD} µg/m³ for its current time. No change is suggested by this rule.`}
              </p>
            </div>
          )}

          {acceptedTime && (
            <div className="mt-4 rounded-xl border border-[#BFDCC7] bg-[#EEF7F0] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#216E49]">
                Accepted schedule change
              </p>
              <p className="mt-2 text-xl font-semibold text-[#172019]">
                {acceptedTime.time}–{acceptedTime.end}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#46544C]">
                Accepted for this demo session. Rescheduling does not
                automatically mean conditions are safe.
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

          <div className="mt-6 space-y-3">
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
                className="w-full rounded-lg border border-[#DDE4DE] bg-white px-4 py-3 text-sm font-semibold text-[#46544C] transition duration-200 hover:border-[#087FC1] hover:bg-[#F3F9FC] focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {acceptedTime ? "Review accepted change" : "Review proposed time"}
              </button>
            )}

            <button
              type="button"
              disabled={
                loading ||
                Boolean(error) ||
                forecast.length === 0 ||
                getActivityAverage(selectedActivity) === null
              }
              onClick={openReviewWithExplanation}
              className="group w-full rounded-lg bg-[#087FC1] px-4 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#06699F] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              <span className="mr-2 inline-block transition-transform duration-200 group-hover:rotate-12">
                ✦
              </span>
              {aiExplanation[selectedActivity.id]
                ? "Open AI insight & review"
                : "Explain recommendation"}
              <span className="ml-2 transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </button>
          </div>

          <p className="mt-3 text-[11px] leading-5 text-[#657168]">
            The AI explains forecast-based options. The scheduling engine checks
            feasibility; the administrator makes the final decision.
          </p>
        </aside>
      </section>

      {/* Combined AI insight and schedule-review modal */}
      {reviewOpen && (
        <div
          className="airwise-overlay fixed inset-0 z-50 flex items-center justify-center bg-[#101812]/60 p-3 backdrop-blur-[5px] sm:p-5"
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
            className="airwise-modal max-h-[92vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-[#DDE4DE] bg-white shadow-2xl sm:rounded-3xl"
          >
            {/* Modal header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E8ECE8] bg-white/95 px-5 py-5 backdrop-blur-md sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#087FC1]">
                  Airwise · Decision support
                </p>
                <h2
                  id="review-modal-title"
                  className="mt-2 text-xl font-semibold tracking-tight text-[#172019] sm:text-2xl"
                >
                  {acceptedTime
                    ? "Review accepted change"
                    : "Review activity timing"}
                </h2>
                <p className="mt-1 text-sm text-[#657168]">
                  {selectedActivity.name} ·{" "}
                  {selectedActivity.durationMinutes}-minute activity
                </p>
              </div>

              <button
                type="button"
                aria-label="Close review"
                onClick={() => setReviewOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#DDE4DE] text-lg text-[#46544C] transition duration-200 hover:rotate-90 hover:bg-[#F3F7F3] focus:outline-none focus:ring-2 focus:ring-[#087FC1]"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-7">
              {/* AI insight */}
             
{/* Collapsible AI insight */}
<div className="overflow-hidden rounded-2xl border border-[#DDE4DE] bg-[#F8FAF7]">
  <button
    type="button"
    aria-expanded={aiExpanded}
    onClick={() => setAiExpanded((previous) => !previous)}
    className="flex w-full items-center gap-3 p-4 text-left transition-colors duration-200 hover:bg-[#F0F6F1] sm:p-5"
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5F3FB] text-xl text-[#087FC1]">
      ✦
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-[#172019]">
        AI activity insight
      </p>
      <p className="mt-1 text-xs text-[#657168]">
        {aiLoading
          ? "Generating explanation…"
          : aiErrors[selectedActivity.id]
            ? "Explanation unavailable"
            : aiExplanation[selectedActivity.id]
              ? "Explanation ready · Amazon Bedrock"
              : "Understand the forecast and recommendation"}
      </p>
    </div>

    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#DDE4DE] bg-white text-[#46544C] transition-transform duration-300 ${
        aiExpanded ? "rotate-180" : "rotate-0"
      }`}
      aria-hidden="true"
    >
      ↓
    </span>
  </button>

  <div
    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
      aiExpanded
        ? "grid-rows-[1fr] opacity-100"
        : "grid-rows-[0fr] opacity-0"
    }`}
    aria-hidden={!aiExpanded}
  >
    <div className="min-h-0 overflow-hidden">
      <div className="border-t border-[#DDE4DE] px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        {aiLoading ? (
          <div className="flex items-start gap-3" role="status">
            <span className="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#DDE4DE] border-t-[#087FC1]" />
            <div>
              <p className="text-sm font-medium text-[#172019]">
                Analysing the available time slots…
              </p>
              <p className="mt-1 text-xs leading-5 text-[#657168]">
                Checking the forecast and proposed alternative.
              </p>
            </div>
          </div>
        ) : aiErrors[selectedActivity.id] ? (
          <div>
            <p role="alert" className="text-sm leading-6 text-[#A6531D]">
              {aiErrors[selectedActivity.id]}
            </p>
            <button
              type="button"
              onClick={() => void generateAiExplanation()}
              className="mt-3 rounded-lg border border-[#DDE4DE] bg-white px-3 py-2 text-xs font-semibold text-[#087FC1] transition hover:bg-[#F3F9FC]"
            >
              Try again
            </button>
          </div>
        ) : aiExplanation[selectedActivity.id] ? (
          <>
            <p className="whitespace-pre-line text-sm leading-7 text-[#344139]">
              {aiExplanation[selectedActivity.id]}
            </p>
            <button
              type="button"
              onClick={() => void generateAiExplanation()}
              disabled={aiLoading}
              className="mt-3 text-xs font-semibold text-[#087FC1] transition hover:text-[#06699F] disabled:opacity-40"
            >
              Generate a fresh explanation ↻
            </button>
          </>
        ) : (
          <>
            <p className="text-sm leading-6 text-[#657168]">
              Generate a plain-English explanation of the forecast and the
              available scheduling option.
            </p>
            <button
              type="button"
              onClick={() => void generateAiExplanation()}
              disabled={aiLoading}
              className="mt-4 w-full rounded-xl bg-[#087FC1] px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-[#06699F] disabled:opacity-50"
            >
              ✦ Generate explanation
            </button>
          </>
        )}

        <p className="mt-4 border-t border-[#DDE4DE] pt-3 text-[11px] leading-5 text-[#657168]">
          AI provides an explanation, not a safety certification. The{" "}
          {ILLUSTRATIVE_PM25_THRESHOLD} µg/m³ planning reference is illustrative,
          not an official safety threshold.
        </p>
      </div>
    </div>
  </div>
</div>

              {/* Original versus proposed slot */}
              <div>
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#657168]">
                    Timetable comparison
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-[#172019]">
                    Review the proposed time
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#E8ECE8] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#657168]">
                      Original scheduled time
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-[#172019]">
                      {originalTime.time}–{originalTime.end}
                    </p>
                    <p className="mt-2 text-sm text-[#46544C]">
                      {calculateAveragePm25(
                        originalTime.time,
                        originalTime.end,
                        forecast
                      )?.toFixed(1) ?? "Unavailable"}{" "}
                      µg/m³ average PM2.5
                    </p>
                  </div>

                  <div
                    className={`rounded-xl border p-4 ${
                      acceptedTime || bestWindow
                        ? "border-[#BFDCC7] bg-[#EEF7F0]"
                        : "border-[#E8ECE8] bg-[#F8FAF7]"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#46544C]">
                      {acceptedTime ? "Accepted time" : "Proposed time"}
                    </p>
                    {acceptedTime ? (
                      <>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-[#172019]">
                          {acceptedTime.time}–{acceptedTime.end}
                        </p>
                        <p className="mt-2 text-sm font-medium text-[#216E49]">
                          Accepted for this demo session
                        </p>
                        <p className="mt-1 text-xs text-[#46544C]">
                          Estimated average:{" "}
                          {calculateAveragePm25(
                            acceptedTime.time,
                            acceptedTime.end,
                            forecast
                          )?.toFixed(1) ?? "Unavailable"}{" "}
                          µg/m³
                        </p>
                      </>
                    ) : bestWindow ? (
                      <>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-[#172019]">
                          {bestWindow.start}–{bestWindow.end}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#216E49]">
                          {bestWindow.pm25.toFixed(1)} µg/m³ estimated average
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#46544C]">
                          A lower-exposure feasible option was found by the
                          scheduling engine.
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-[#46544C]">
                        No feasible lower-exposure window was found. Keep the
                        current timetable and consider other appropriate
                        measures.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Conflict explanation */}
              {!acceptedTime && (
                <div>
                  <h3 className="text-sm font-semibold text-[#172019]">
                    Lower-exposure alternatives rejected
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[#657168]">
                    These options have lower estimated PM2.5 but overlap with
                    existing timetable commitments.
                  </p>

                  {rejectedWindows.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {rejectedWindows.map((window) => (
                        <div
                          key={`${window.start}-${window.end}`}
                          className="rounded-xl border border-[#E8ECE8] p-3 transition-colors duration-200 hover:bg-[#FAFCFA]"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold text-[#172019]">
                              {window.start}–{window.end}
                            </p>
                            <p className="text-sm font-semibold text-[#46544C]">
                              {window.pm25.toFixed(1)} µg/m³
                            </p>
                          </div>
                          <div className="mt-2 space-y-1">
                            {window.conflicts.map((conflict, index) => (
                              <p
                                key={`${conflict.activityId}-${conflict.type}-${index}`}
                                className="text-xs leading-5 text-[#46544C]"
                              >
                                <span className="font-semibold text-[#A6531D]">
                                  Conflict:{" "}
                                </span>
                                {conflict.reason}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-[#F8FAF7] p-3 text-xs leading-5 text-[#657168]">
                      No lower-exposure conflicting windows were found.
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs leading-6 text-[#657168]">
                Forecast values are modelled estimates, not local station
                measurements. Accepting a proposal updates only this demo
                session and resets on refresh. The administrator remains
                responsible for the final decision.
              </p>
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-[#E8ECE8] bg-white/95 px-5 py-4 backdrop-blur-md sm:flex-row sm:justify-end sm:px-7">
              {acceptedTime ? (
                <>
                  <button
                    type="button"
                    onClick={() => setReviewOpen(false)}
                    className="rounded-xl border border-[#DDE4DE] px-4 py-3 text-sm font-semibold text-[#46544C] transition duration-200 hover:bg-[#F6F8F6] focus:outline-none focus:ring-2 focus:ring-[#087FC1]"
                  >
                    Keep current time
                  </button>
                  <button
                    type="button"
                    onClick={revertToOriginalTime}
                    className="rounded-xl border border-[#DDE4DE] px-4 py-3 text-sm font-semibold text-[#A6531D] transition duration-200 hover:border-[#E9B99D] hover:bg-[#FFF4EB] focus:outline-none focus:ring-2 focus:ring-[#087FC1]"
                  >
                    Revert to original
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setReviewOpen(false)}
                    className="rounded-xl border border-[#DDE4DE] px-4 py-3 text-sm font-semibold text-[#46544C] transition duration-200 hover:bg-[#F6F8F6] focus:outline-none focus:ring-2 focus:ring-[#087FC1]"
                  >
                    Keep original time
                  </button>
                  <button
                    type="button"
                    disabled={!bestWindow}
                    onClick={acceptProposedTime}
                    className="rounded-xl bg-[#087FC1] px-5 py-3 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[#06699F] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                  >
                    Accept proposed time →
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

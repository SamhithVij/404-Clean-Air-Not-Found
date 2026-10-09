import { Activity } from "../data/demo-school";
import { demoForecast } from "../data/demo-forecast";
import { findConflicts } from "./scheduling-engine";

export type AirWindow = {
  start: string;
  end: string;
  pm25: number;
};

export type Recommendation = {
  start: string;
  end: string;
  pm25: number;
  conflicts: ReturnType<typeof findConflicts>;
  feasible: boolean;
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/*
  Calculate average PM2.5 directly from forecast points
  within an activity window.

  Returns null if no forecast points cover the window.
*/
export function getAveragePm25(
  start: string,
  end: string,
  forecast: { time: string; pm25: number }[] = demoForecast
): number | null {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  const points = forecast.filter((point) => {
    const pointMinutes = timeToMinutes(point.time);

    return pointMinutes >= startMinutes && pointMinutes < endMinutes;
  });

  if (points.length === 0) {
    return null;
  }

  const average =
    points.reduce((sum, point) => sum + point.pm25, 0) / points.length;

  return Math.round(average * 10) / 10;
}

/*
  Evaluate one proposed time against the school timetable.
*/
export function evaluateWindow(
  activity: Activity,
  start: string,
  end: string,
  pm25: number,
  allActivities: Activity[]
): Recommendation {
  const conflicts = findConflicts(
    activity,
    { start, end },
    allActivities
  );

  return {
    start,
    end,
    pm25,
    conflicts,
    feasible: conflicts.length === 0,
  };
}

/*
  Generate candidate windows:
  - preserve activity duration
  - begin every 15 minutes
  - remain inside school hours
*/
export function generateCandidateWindows(
  activity: Activity,
  forecast: { time: string; pm25: number }[] = demoForecast,
  schoolStart = "08:00",
  schoolEnd = "16:00"
): AirWindow[] {
  const duration = activity.durationMinutes;
  const startMinutes = timeToMinutes(schoolStart);
  const endMinutes = timeToMinutes(schoolEnd);

  const candidates: AirWindow[] = [];

  for (
    let current = startMinutes;
    current + duration <= endMinutes;
    current += 15
  ) {
    const start = minutesToTime(current);
    const end = minutesToTime(current + duration);

    const pm25 = getAveragePm25(start, end, forecast);

    if (pm25 === null) {
      continue;
    }

    candidates.push({ start, end, pm25 });
  }

  return candidates;
}

/*
  Find the lowest-exposure feasible window below
  the activity's current average PM2.5.
*/
export function findBestFeasibleWindow(
  activity: Activity,
  forecast: { time: string; pm25: number }[] = demoForecast,
  allActivities: Activity[],
  currentPm25: number,
  schoolStart = "08:00",
  schoolEnd = "16:00"
): Recommendation | null {
  const candidates = generateCandidateWindows(
    activity,
    forecast,
    schoolStart,
    schoolEnd
  );

  const evaluated = candidates
    .filter((window) => window.pm25 < currentPm25)
    .map((window) =>
      evaluateWindow(
        activity,
        window.start,
        window.end,
        window.pm25,
        allActivities
      )
    );

  const feasible = evaluated
    .filter((window) => window.feasible)
    .sort((a, b) => a.pm25 - b.pm25);

  return feasible[0] ?? null;
}

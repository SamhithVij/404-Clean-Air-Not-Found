import { Activity } from "../data/demo-school";

export type Conflict = {
  activityId: string;
  activityName: string;
  type: "location" | "teacher" | "year-group";
  reason: string;
};

export type TimeWindow = {
  start: string;
  end: string;
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
}

function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);

  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);

  return aStart < bEnd && bStart < aEnd;
}

/*
  Convert labels such as:

  "Year 2"
  "Years 3–6"
  "Years 5–6"

  into the individual year numbers they represent.
*/
function expandYearGroups(yearGroups: string[]): number[] {
  const years: number[] = [];

  for (const group of yearGroups) {
    const numbers = group.match(/\d+/g);

    if (!numbers || numbers.length === 0) {
      continue;
    }

    if (numbers.length === 1) {
      years.push(Number(numbers[0]));
      continue;
    }

    const start = Number(numbers[0]);
    const end = Number(numbers[1]);

    for (let year = start; year <= end; year++) {
      years.push(year);
    }
  }

  return [...new Set(years)];
}

function haveSharedYearGroups(
  first: Activity,
  second: Activity
): number | null {
  const firstYears = expandYearGroups(first.yearGroups);
  const secondYears = expandYearGroups(second.yearGroups);

  for (const year of firstYears) {
    if (secondYears.includes(year)) {
      return year;
    }
  }

  return null;
}

export function findConflicts(
  activity: Activity,
  proposedWindow: TimeWindow,
  allActivities: Activity[]
): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const other of allActivities) {
    if (other.id === activity.id) {
      continue;
    }

    /*
      Only activities happening at the same time can conflict.
    */
    if (
      !overlaps(
        proposedWindow.start,
        proposedWindow.end,
        other.time,
        other.end
      )
    ) {
      continue;
    }

    /*
      Shared physical resource.
    */
    if (activity.location === other.location) {
      conflicts.push({
        activityId: other.id,
        activityName: other.name,
        type: "location",
        reason: `${other.name} already uses the ${activity.location} during this time.`,
      });
    }

    /*
      Same teacher.
    */
    if (activity.teacher === other.teacher) {
      conflicts.push({
        activityId: other.id,
        activityName: other.name,
        type: "teacher",
        reason: `${other.teacher} is already assigned to ${other.name} during this time.`,
      });
    }

    /*
      Overlapping year groups.

      Example:
      Years 3–6
      and
      Years 5–6

      share Years 5 and 6.
    */
    const sharedYear = haveSharedYearGroups(activity, other);

    if (sharedYear !== null) {
      conflicts.push({
        activityId: other.id,
        activityName: other.name,
        type: "year-group",
        reason: `${other.name} already involves Year ${sharedYear} during this time.`,
      });
    }
  }

  return conflicts;
}
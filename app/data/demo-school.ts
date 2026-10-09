export type Activity = {
  id: string;
  time: string;
  end: string;
  name: string;
  detail: string;

  // Scheduling constraints
  yearGroups: string[];
  teacher: string;
  location: string;
  durationMinutes: number;
  movable: boolean;

  // Demo air-quality result
  status: "normal" | "elevated";
  pollution: string;
  overlap: string;
  option: string;
};

export const activities: Activity[] = [
  {
    id: "assembly",
    time: "08:15",
    end: "08:40",
    name: "Morning assembly",
    detail: "Whole school · Courtyard",
    yearGroups: ["Years 1–12"],
    teacher: "Whole school",
    location: "Courtyard",
    durationMinutes: 25,
    movable: false,
    status: "normal",
    pollution: "24–28 µg/m³",
    overlap: "No elevated overlap",
    option: "—",
  },
  {
    id: "recess",
    time: "09:45",
    end: "10:05",
    name: "Morning recess",
    detail: "Years 1–4 · Playground",
    yearGroups: ["Years 1–4"],
    teacher: "Primary staff",
    location: "Playground",
    durationMinutes: 20,
    movable: true,
    status: "elevated",
    pollution: "41–44 µg/m³",
    overlap: "20 min above threshold",
    option: "13:00–13:20",
  },
  {
    id: "pe-5-6",
    time: "10:30",
    end: "11:15",
    name: "PE · Years 5–6",
    detail: "45 min · Sports field",
    yearGroups: ["Years 5–6"],
    teacher: "PE staff",
    location: "Sports field",
    durationMinutes: 45,
    movable: true,
    status: "elevated",
    pollution: "46–48 µg/m³",
    overlap: "45 min above threshold",
    option: "14:00–14:45",
  },
  {
    id: "garden",
    time: "12:00",
    end: "12:40",
    name: "Garden club",
    detail: "Years 3–6 · School garden",
    yearGroups: ["Years 3–6"],
    teacher: "Ms. Patel",
    location: "School garden",
    durationMinutes: 40,
    movable: true,
    status: "elevated",
    pollution: "32–39 µg/m³",
    overlap: "30 min above threshold",
    option: "13:20–14:00",
  },
  {
    id: "reading",
    time: "13:30",
    end: "13:45",
    name: "Outdoor reading",
    detail: "Year 2 · Courtyard",
    yearGroups: ["Year 2"],
    teacher: "Ms. Sharma",
    location: "Courtyard",
    durationMinutes: 15,
    movable: true,
    status: "normal",
    pollution: "23–25 µg/m³",
    overlap: "No elevated overlap",
    option: "Existing time",
  },
  {
    id: "football",
    time: "15:00",
    end: "15:50",
    name: "Football practice",
    detail: "Years 5–6 · Sports field",
    yearGroups: ["Years 5–6"],
    teacher: "PE staff",
    location: "Sports field",
    durationMinutes: 50,
    movable: true,
    status: "normal",
    pollution: "18–19 µg/m³",
    overlap: "No elevated overlap",
    option: "Existing time",
  },

  // Deliberate timetable conflict for the recommendation engine.
  {
    id: "pe-8",
    time: "14:00",
    end: "14:45",
    name: "PE · Year 8",
    detail: "45 min · Sports field",
    yearGroups: ["Year 8"],
    teacher: "PE staff",
    location: "Sports field",
    durationMinutes: 45,
    movable: false,
    status: "normal",
    pollution: "23–25 µg/m³",
    overlap: "No elevated overlap",
    option: "Fixed timetable",
  },
];
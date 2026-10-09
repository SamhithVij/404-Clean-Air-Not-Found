export type ForecastPoint = {
  time: string;
  pm25: number;
};

export const demoForecast: ForecastPoint[] = [
  { time: "08:00", pm25: 23 },
  { time: "08:15", pm25: 25 },
  { time: "08:30", pm25: 27 },
  { time: "08:45", pm25: 28 },

  { time: "09:00", pm25: 29 },
  { time: "09:15", pm25: 33 },
  { time: "09:30", pm25: 38 },
  { time: "09:45", pm25: 41 },

  { time: "10:00", pm25: 43 },
  { time: "10:15", pm25: 45 },
  { time: "10:30", pm25: 46 },
  { time: "10:45", pm25: 47 },

  { time: "11:00", pm25: 48 },
  { time: "11:15", pm25: 47 },
  { time: "11:30", pm25: 44 },
  { time: "11:45", pm25: 41 },

  { time: "12:00", pm25: 39 },
  { time: "12:15", pm25: 36 },
  { time: "12:30", pm25: 33 },
  { time: "12:45", pm25: 30 },

  { time: "13:00", pm25: 28 },
  { time: "13:15", pm25: 26 },
  { time: "13:30", pm25: 24 },
  { time: "13:45", pm25: 23 },

  { time: "14:00", pm25: 22 },
  { time: "14:15", pm25: 21 },
  { time: "14:30", pm25: 20 },
  { time: "14:45", pm25: 20 },

  { time: "15:00", pm25: 19 },
  { time: "15:15", pm25: 19 },
  { time: "15:30", pm25: 18 },
  { time: "15:45", pm25: 18 },
];
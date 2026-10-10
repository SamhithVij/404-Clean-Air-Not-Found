# Airwise — School Air Quality Intelligence

**Built by Team 404: Clean Air Not Found** for the AWS / WeMakeDevs Environmental Hacks.

Airwise helps school administrators and teachers make more informed decisions about outdoor activities when forecast PM2.5 levels are elevated. It brings an air-quality forecast, activity-level guidance, and schedule alternatives into one dashboard.

## Live demo

**Try Airwise:** https://main.divfs8o5h0w7c.amplifyapp.com

The application is deployed publicly on **AWS Amplify**.

> **Important:** Airwise is a planning aid, not a medical device or an official air-quality alert system. Its PM2.5 planning reference is illustrative, not a universal health or regulatory threshold. Forecasts are modelled estimates, not measurements from a sensor at the school. School staff should use local official guidance and their own safeguarding procedures when making decisions.

## The problem

Schools often plan PE lessons, assemblies, sports, and other outdoor activities without an easy way to relate the timing of those activities to changing air pollution. Moving an activity indoors or to another time can also create timetable conflicts.

## What Airwise does

- **Air-quality overview:** presents forecast PM2.5 levels and a time-series chart so staff can see how conditions may change through the day.
- **Activity-level guidance:** evaluates forecast PM2.5 over an activity's scheduled time window and flags activities that warrant review against Airwise's illustrative planning reference.
- **Alternative time suggestions:** searches for feasible replacement windows while preserving activity duration.
- **Conflict-aware scheduling:** checks timetable constraints such as overlapping times and shared locations, teachers, or year groups when evaluating alternatives.
- **Clear limitations:** distinguishes forecast information from sensor readings and explains that a threshold flag is a prompt for human review—not an automatic declaration that conditions are safe or unsafe.

The dashboard currently uses demo school timetable data. Recommendations support human decision-making; Airwise does not autonomously cancel activities or close a school.

## How it works

1. The Next.js application requests forecast data from its `/api/forecast` route.
2. The route calls the [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) for hourly PM2.5 forecast data for Delhi, India, using the `Asia/Kolkata` timezone.
3. The dashboard visualises the forecast and evaluates activity windows using the scheduling and recommendation logic in `app/lib/`.
4. Feasible alternatives are presented for staff to review before making any timetable change.

### Current implementation status

The deployed web application fetches forecast data through the Next.js API route and performs recommendation and scheduling calculations in application code. The forecast location is currently configured to Delhi, India; it is **not yet configured from an individual school's location**.

AWS ingestion/storage components explored during the hackathon (including Lambda, DynamoDB, API Gateway, and EventBridge) should be treated as a separate prototype/architecture unless explicitly wired into the application. This repository's current `/api/forecast` route calls Open-Meteo directly; it does not claim that the web dashboard's forecast request passes through those AWS services.

## Architecture

```text
School staff
    |
    v
Airwise dashboard (Next.js / React)
    |
    v
Next.js API route: /api/forecast
    |
    v
Open-Meteo Air Quality API
    |
    v
Hourly PM2.5 forecast
    |
    v
Dashboard chart + activity recommendations
    |
    v
Feasible alternative windows for human review
```

The timetable recommendation and conflict-checking logic is implemented in `app/lib/recommendations.ts` and `app/lib/scheduling-engine.ts`.

## Technology stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Forecast data:** Open-Meteo Air Quality API
- **Decision support:** TypeScript recommendation and schedule-conflict logic
- **Hosting:** AWS Amplify

## Run locally

These instructions are for developers who want to run or modify the project on their own machine. To use Airwise, open the [live demo](https://main.divfs8o5h0w7c.amplifyapp.com).

### Requirements

- Node.js (LTS recommended)
- npm

### Setup

```bash
git clone https://github.com/SamhithVij/404-Clean-Air-Not-Found.git
cd 404-Clean-Air-Not-Found
npm install
npm run dev
```

The local development server will be available at [http://localhost:3000](http://localhost:3000).

### Useful commands

```bash
npm run dev     # Start the local development server
npm run build   # Create a production build
npm run start   # Serve the production build (after npm run build)
npm run lint    # Run ESLint, if configured in package.json
```

No API key is currently required for the Open-Meteo forecast request in this repository.

## Project structure

```text
app/
  api/forecast/route.ts       # Server route for Open-Meteo forecast data
  components/                 # Dashboard UI components
  data/                       # Demo school timetable data
  hooks/use-air-quality.ts    # Forecast data hook
  lib/
    recommendations.ts        # PM2.5 activity evaluation and alternatives
    scheduling-engine.ts      # Schedule feasibility and conflict checks
  page.tsx                    # Main dashboard
```

## Data and interpretation

- **Variable:** PM2.5, in micrograms per cubic metre (`µg/m³`).
- **Provider:** Open-Meteo Air Quality API.
- **Forecast location:** Delhi, India (configured in `app/api/forecast/route.ts`).
- **Time zone:** `Asia/Kolkata`.
- **Planning reference:** defined in the application as `ILLUSTRATIVE_PM25_THRESHOLD`; it is intended to demonstrate the workflow and should not be interpreted as a universal safety limit.

Forecast accuracy and conditions at a particular school can differ from the modelled forecast. A school-specific deployment should configure the school's coordinates, validate data freshness, and use applicable local public-health guidance.

## Future improvements

- Configure forecasts by school location and clearly show forecast issue/update times.
- Connect a production data-ingestion pipeline and persistent storage where needed.
- Add school-specific policies, timetable configuration, and stronger validation of scheduling constraints.
- Improve accessibility, testing, monitoring, and deployment documentation.

## Team

**404: Clean Air Not Found**  
Project: **Airwise — School Air Quality Intelligence**

---

Made for Environmental Hacks.
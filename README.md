# Airwise — School Air Quality Intelligence

**Team 404: Clean Air Not Found** · AWS / WeMakeDevs Environmental Hacks

## Live demo

### [Open Airwise](https://main.divfs8o5h0w7c.amplifyapp.com)

Airwise is a school air-quality decision-support dashboard that helps staff review outdoor activities when forecast PM2.5 levels are elevated and consider feasible alternative times.

> **Safety note:** Airwise is a planning aid, not an official alert system or a medical device. Its PM2.5 planning reference is illustrative—not a universal health or regulatory threshold. Forecasts are modelled estimates, not readings from a sensor at the school. Final decisions remain with school staff, following local official guidance.

## The problem

Schools schedule PE lessons, sports, assemblies, and other outdoor activities against a timetable that can be difficult to adjust at short notice. When air pollution is forecast to rise, staff need to understand which activities overlap with elevated forecast levels and whether an alternative time is feasible without creating timetable conflicts.

## Our solution

Airwise combines an air-quality forecast with activity-aware schedule recommendations:

- **Forecast overview:** displays hourly PM2.5 values and a chart to show how forecast conditions may change over the day.
- **Activity-level review:** evaluates the forecast across each activity's scheduled window against an illustrative planning reference.
- **Alternative time windows:** searches for feasible replacement slots while preserving activity duration.
- **Conflict-aware scheduling:** considers overlaps and shared timetable resources such as locations, teachers, and year groups.
- **Human-in-the-loop decisions:** provides guidance for staff to review; it does not automatically cancel activities or declare conditions safe.

The current dashboard uses demo school timetable data, and the forecast location is configured to Delhi, India—not a specific school's coordinates.

## Architecture

Airwise has two related parts: the deployed web dashboard and the AWS forecast-ingestion/storage prototype. They are shown separately here to make the current integration status clear.

### 1. Deployed dashboard

```text
School staff
    |
    v
Airwise dashboard
Next.js / React, hosted on AWS Amplify
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
Dashboard visualisation + schedule recommendations
```

In the checked-in application code, `/api/forecast` calls Open-Meteo directly. The scheduling and recommendation calculations run in the application.

### 2. AWS forecast-ingestion and storage prototype

```text
Amazon EventBridge
(scheduled trigger configured)
          |
          v
AWS Lambda — ingestion
          |
          v
Open-Meteo Air Quality API
          |
          v
Amazon DynamoDB
          ^
          |
AWS Lambda — API handler
          ^
          |
Amazon API Gateway (HTTP API)
```

The ingestion Lambda retrieves forecast data and stores records in DynamoDB. An API Lambda reads the stored data, exposed through an API Gateway HTTP API. The API Gateway endpoint was tested successfully returning data from DynamoDB. EventBridge was configured for scheduled invocation, although the scheduled run itself was not conclusively verified during the hackathon.

**Integration status:** The AWS ingestion/API path was built and tested as a prototype, but it is not the data path used by the repository's current `/api/forecast` route. The live dashboard should therefore not be described as routing every forecast request through API Gateway and DynamoDB.

## How we used AWS

- **AWS Amplify:** hosts the public Airwise web application.
- **AWS Lambda:** runs the forecast ingestion logic and the API handler as serverless functions.
- **Amazon DynamoDB:** stores forecast data produced by ingestion for retrieval by the API handler.
- **Amazon API Gateway (HTTP API):** exposes the API Lambda so stored forecast data can be requested over HTTP.
- **Amazon EventBridge:** configured to trigger scheduled ingestion, reducing the need for manual refreshes; scheduled execution was not fully verified in the hackathon window.

This architecture demonstrates a serverless approach to ingestion and retrieval while keeping the dashboard's timetable recommendation logic in the Next.js application.

## Technology stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS
- **Charts:** Recharts
- **Air-quality data:** Open-Meteo Air Quality API
- **Scheduling logic:** TypeScript recommendation and conflict-checking functions
- **AWS:** Amplify, Lambda, DynamoDB, API Gateway, EventBridge

## Data and limitations

- **Pollutant:** PM2.5, measured in micrograms per cubic metre (`µg/m³`).
- **Forecast provider:** [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api).
- **Configured forecast location:** Delhi, India.
- **Time zone:** `Asia/Kolkata`.
- **Planning reference:** defined in the code as `ILLUSTRATIVE_PM25_THRESHOLD`; it is intended to demonstrate activity review and is not a universal safety limit.

Forecasts may differ from actual conditions at a school. A school-specific deployment should use the school's coordinates, communicate data freshness, and follow applicable local public-health guidance. Airwise supports decisions; it does not replace official alerts or professional judgement.

## Team

**404: Clean Air Not Found**  
**Project:** Airwise — School Air Quality Intelligence

Made for Environmental Hacks.

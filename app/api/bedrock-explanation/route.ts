
import { NextResponse } from "next/server";
import {
  SSMClient,
  GetParameterCommand,
} from "@aws-sdk/client-ssm";

export const maxDuration = 30;

const ssm = new SSMClient({ region: "ap-south-1" });

const PARAMETER_NAME =
  "/amplify/divfs8o5h0w7c/main/BEDROCK_MANTLE_API_KEY";

type ExplanationRequest = {
  activityName?: string;
  activityDetail?: string;
  startTime?: string;
  endTime?: string;
  averagePm25?: number | null;
  threshold?: number;
  alternative?: {
    start: string;
    end: string;
    averagePm25: number;
  } | null;
};

function isValidTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
  );
}

async function getBedrockApiKey(): Promise<string> {
  // Local development can continue using your existing .env.local.
  const localKey = process.env.AWS_BEARER_TOKEN_BEDROCK;

  if (localKey) {
    return localKey;
  }

  // On Amplify, use the attached SSR compute role.
  const result = await ssm.send(
    new GetParameterCommand({
      Name: PARAMETER_NAME,
      WithDecryption: true,
    })
  );

  const key = result.Parameter?.Value;

  if (!key) {
    throw new Error("Bedrock parameter is missing or empty.");
  }

  return key;
}

export async function POST(request: Request) {
  const baseUrl =
    process.env.BEDROCK_MANTLE_BASE_URL ??
    "https://bedrock-mantle.ap-south-1.api.aws/v1";

  const model =
    process.env.BEDROCK_MANTLE_MODEL ??
    "google.gemma-3-12b-it";

  const project =
    process.env.BEDROCK_MANTLE_PROJECT ?? "default";

  let input: ExplanationRequest;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }

  const {
    activityName,
    activityDetail,
    startTime,
    endTime,
    averagePm25,
    threshold = 35,
    alternative,
  } = input;

  if (
    typeof activityName !== "string" ||
    activityName.length < 1 ||
    activityName.length > 120 ||
    typeof activityDetail !== "string" ||
    activityDetail.length > 300 ||
    !isValidTime(startTime) ||
    !isValidTime(endTime) ||
    typeof averagePm25 !== "number" ||
    !Number.isFinite(averagePm25) ||
    averagePm25 < 0 ||
    typeof threshold !== "number" ||
    !Number.isFinite(threshold) ||
    threshold <= 0 ||
    (alternative != null &&
      (!isValidTime(alternative.start) ||
        !isValidTime(alternative.end) ||
        typeof alternative.averagePm25 !== "number" ||
        !Number.isFinite(alternative.averagePm25) ||
        alternative.averagePm25 < 0))
  ) {
    return NextResponse.json(
      { error: "Activity or forecast details are invalid." },
      { status: 400 }
    );
  }

  const alternativeText =
    alternative &&
    `Proposed alternative: ${alternative.start}-${alternative.end}, estimated average PM2.5 ${alternative.averagePm25.toFixed(1)} µg/m³.`;

  const prompt = [
    "Explain this school outdoor-activity forecast for a school administrator.",
    "Use only the supplied facts. Do not invent measurements, causes, health outcomes, or schedule options.",
    "The PM2.5 reference is illustrative, not an official safety threshold.",
    "The scheduler has already checked timetable feasibility; do not make new scheduling decisions.",
    "Write 2-4 concise sentences in plain English.",
    "Explain whether the current activity warrants review and, if supplied, compare the proposed alternative using only the numbers provided.",
    "Do not claim an alternative is guaranteed safe. The administrator makes the final decision.",
    "",
    `Activity: ${activityName}`,
    `Activity details: ${activityDetail || "Not provided"}`,
    `Scheduled time: ${startTime}-${endTime}`,
    `Estimated average PM2.5: ${averagePm25.toFixed(1)} µg/m³`,
    `Illustrative planning reference: ${threshold.toFixed(1)} µg/m³`,
    alternativeText ?? "No feasible alternative was supplied.",
  ]
    .filter(Boolean)
    .join("\n");

  let apiKey: string;

  try {
    apiKey = await getBedrockApiKey();
  } catch {
    console.error("Unable to retrieve Bedrock credentials from configuration.");

    return NextResponse.json(
      { error: "AI credentials are unavailable on the server." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Project": project,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 180,
        temperature: 0.2,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      console.error(
        "Bedrock explanation request failed:",
        response.status
      );

      return NextResponse.json(
        { error: "The AI explanation service is temporarily unavailable." },
        { status: 502 }
      );
    }

    const result = await response.json();
    const explanation = result.choices?.[0]?.message?.content;

    if (
      typeof explanation !== "string" ||
      !explanation.trim()
    ) {
      return NextResponse.json(
        { error: "The model returned an empty explanation." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      explanation: explanation.trim(),
      model,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not connect to the AI explanation service." },
      { status: 502 }
    );
  }
}

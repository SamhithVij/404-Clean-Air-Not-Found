
"use client";

import { useEffect, useState } from "react";

type MorningBriefingProps = {
  schoolName: string;
  reviewCount: number | null;
  loading: boolean;
  onContinue: () => void;
};

export default function MorningBriefing({
  schoolName,
  reviewCount,
  loading,
  onContinue,
}: MorningBriefingProps) {
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    setReducedMotion(motionQuery.matches);

    // Show once per day in this browser.
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    const lastSeen = window.localStorage.getItem("airwise-briefing-date");

    if (lastSeen !== today) {
      setVisible(true);
    }
     const handleReplayIntro = () => setVisible(true);

    window.addEventListener("airwise:show-intro", handleReplayIntro);

    return () => {
      window.removeEventListener("airwise:show-intro", handleReplayIntro);
    };
  }, []);

  const dismiss = () => {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    window.localStorage.setItem("airwise-briefing-date", today);
    setVisible(false);

    window.setTimeout(onContinue, reducedMotion ? 0 : 450);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#F5F8F6] ${
        reducedMotion ? "" : "airwise-intro"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="morning-briefing-title"
    >
      <style>{`
        @keyframes airwise-flow-left {
          0% {
            transform: translate(-45%, 12%) rotate(-12deg) scale(0.8);
            opacity: 0;
          }
          35% { opacity: 0.9; }
          100% {
            transform: translate(12%, -2%) rotate(5deg) scale(1.1);
            opacity: 0.55;
          }
        }

        @keyframes airwise-flow-right {
          0% {
            transform: translate(45%, -10%) rotate(12deg) scale(0.8);
            opacity: 0;
          }
          35% { opacity: 0.85; }
          100% {
            transform: translate(-12%, 5%) rotate(-5deg) scale(1.1);
            opacity: 0.55;
          }
        }

        @keyframes airwise-card-arrive {
          0% {
            opacity: 0;
            transform: translateY(34px) scale(0.94);
            filter: blur(8px);
          }
          70% {
            opacity: 1;
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes airwise-particle {
          0% {
            transform: translateX(-25px) translateY(15px);
            opacity: 0;
          }
          30% { opacity: 0.75; }
          100% {
            transform: translateX(35px) translateY(-20px);
            opacity: 0;
          }
        }

        .airwise-ribbon-left {
          animation: airwise-flow-left 1.7s cubic-bezier(.2,.7,.2,1) both;
        }

        .airwise-ribbon-right {
          animation: airwise-flow-right 1.7s cubic-bezier(.2,.7,.2,1) both;
        }

        .airwise-briefing-card {
          animation: airwise-card-arrive .85s .55s cubic-bezier(.2,.7,.2,1) both;
        }

        .airwise-particle {
          animation: airwise-particle 2.4s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .airwise-ribbon-left,
          .airwise-ribbon-right,
          .airwise-briefing-card,
          .airwise-particle {
            animation: none !important;
          }
        }
      `}</style>

      {/* Soft atmospheric background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[#CDEBFA]/50 blur-[100px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#FCE0CA]/45 blur-[100px]" />

        {/* Air ribbons converge toward the centre */}
        <svg
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="airwise-blue-ribbon">
              <stop offset="0%" stopColor="#087FC1" stopOpacity="0" />
              <stop offset="50%" stopColor="#63BDEB" stopOpacity=".65" />
              <stop offset="100%" stopColor="#087FC1" stopOpacity=".04" />
            </linearGradient>

            <linearGradient id="airwise-orange-ribbon">
              <stop offset="0%" stopColor="#F07828" stopOpacity="0" />
              <stop offset="50%" stopColor="#F7B27F" stopOpacity=".55" />
              <stop offset="100%" stopColor="#F07828" stopOpacity=".02" />
            </linearGradient>
          </defs>

          <g className="airwise-ribbon-left">
            <path
              d="M-100 180 C180 100 260 570 700 450 S1050 360 1510 170"
              fill="none"
              stroke="url(#airwise-blue-ribbon)"
              strokeWidth="38"
              strokeLinecap="round"
            />
            <path
              d="M-100 260 C200 180 350 640 720 470 S1120 330 1510 260"
              fill="none"
              stroke="url(#airwise-blue-ribbon)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              d="M-100 370 C200 280 330 650 730 500 S1150 420 1510 340"
              fill="none"
              stroke="#087FC1"
              strokeOpacity=".16"
              strokeWidth="2"
            />
          </g>

          <g className="airwise-ribbon-right">
            <path
              d="M1540 620 C1200 790 1150 290 760 440 S300 540 -100 700"
              fill="none"
              stroke="url(#airwise-orange-ribbon)"
              strokeWidth="34"
              strokeLinecap="round"
            />
            <path
              d="M1540 720 C1250 820 1120 350 740 470 S260 600 -100 790"
              fill="none"
              stroke="url(#airwise-orange-ribbon)"
              strokeWidth="12"
              strokeLinecap="round"
            />
          </g>

          {[
            [180, 260],
            [340, 580],
            [1120, 250],
            [1260, 610],
            [930, 720],
            [500, 210],
            [800, 170],
          ].map(([cx, cy], index) => (
            <circle
              key={index}
              cx={cx}
              cy={cy}
              r={index % 2 === 0 ? 3 : 2}
              fill={index % 2 === 0 ? "#087FC1" : "#F07828"}
              opacity=".5"
              className="airwise-particle"
              style={{ animationDelay: `${index * 0.18}s` }}
            />
          ))}
        </svg>
      </div>

      {/* Skip remains available throughout the animation */}
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-6 top-6 z-10 rounded-full border border-[#DDE4DE] bg-white/80 px-4 py-2 text-sm text-[#46544C] backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#087FC1]"
      >
        Skip intro →
      </button>

      {/* Central briefing */}
      <section className="airwise-briefing-card relative z-10 mx-5 w-full max-w-[510px] rounded-[28px] border border-white/90 bg-white/90 p-7 shadow-[0_30px_100px_rgba(23,32,25,0.12)] backdrop-blur-xl sm:p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F5FC]">
            <svg
              width="26"
              height="26"
              viewBox="0 0 40 40"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M9 25.5L16 11L23 25.5"
                stroke="#F07828"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 25.5H29C33 25.5 35 22.8 35 19.5C35 16.2 32.4 13.5 29 13.5C27.9 13.5 26.9 13.8 26 14.3"
                stroke="#087FC1"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 25.5C5.7 25.5 4 27.5 4 30C4 32.5 6 34 9 34H29C32 34 34 32 34 29"
                stroke="#087FC1"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <p className="text-sm font-semibold tracking-tight text-[#172019]">
              AIRWISE
            </p>
            <p className="text-[10px] tracking-[0.15em] text-[#657168]">
              YOUR MORNING BRIEFING
            </p>
          </div>
        </div>

        <p className="mt-8 text-sm text-[#657168]">
          GOOD MORNING
        </p>

        <h1
          id="morning-briefing-title"
          className="mt-2 text-3xl font-semibold tracking-tight text-[#172019] sm:text-4xl"
        >
          {schoolName}
        </h1>

        <p className="mt-4 text-sm leading-6 text-[#59645C]">
          Let's see what today's air-quality forecast means for your outdoor
          activities.
        </p>

        <div className="mt-7 rounded-2xl border border-[#E4EAE5] bg-[#F8FAF8] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F5FC] text-[#087FC1]">
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 8h12a3 3 0 1 0-3-3" />
                <path d="M2 12h17a3 3 0 1 1-3 3" />
                <path d="M4 16h7a3 3 0 1 1-3 3" />
              </svg>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#172019]">
                {loading
                  ? "Checking today's forecast…"
                  : reviewCount === null
                    ? "Your briefing is ready"
                    : reviewCount === 0
                      ? "No activities flagged for review"
                      : `${reviewCount} ${reviewCount === 1 ? "activity needs" : "activities need"} review`}
              </p>

              <p className="mt-1 text-xs leading-5 text-[#657168]">
                {loading
                  ? "We'll show your priorities when the data is ready."
                  : reviewCount === null
                    ? "Open your dashboard to check today's schedule."
                    : reviewCount === 0
                      ? "No movable activities currently meet the demo review criteria."
                      : "Review the forecast and explore alternative time windows."}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#087FC1] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#066BA4] focus:outline-none focus:ring-2 focus:ring-[#087FC1] focus:ring-offset-2"
        >
          View today's dashboard
          <span aria-hidden="true">→</span>
        </button>

        <p className="mt-4 text-center text-[11px] leading-5 text-[#89928B]">
          Forecast-based decision support. School staff remain in control.
        </p>
      </section>
    </div>
  );
}

import DayAtGlance from "./components/day-at-glance";
import OutdoorSchedule from "./components/outdoor-schedule";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8FAF7] text-[#172019]">
      {/* Header */}
      <header className="border-b border-[#DDE4DE]">
        <div className="mx-auto flex h-[76px] max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold">404</span>

            <span className="text-sm font-medium tracking-wide">
              CLEAN AIR NOT FOUND
            </span>
          </div>

          <div className="text-right text-xs">
            <div className="font-medium">TODAY · OCT 08</div>
            <div className="text-[#59645C]">GREENFIELD SCHOOL</div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-[1200px] px-6">
        {/* Hero */}
        <section className="flex items-center justify-between gap-12 py-16">
          <div className="max-w-[760px]">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#2F8F5B]">
              AIR TODAY
            </p>

            <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.035em] text-[#172019]">
              A clearer plan for
              <br />
              outdoor time.
            </h1>

            <p className="mt-6 max-w-[700px] text-lg leading-8 text-[#59645C]">
              See which outdoor activities overlap with elevated air pollution
              and identify lower-exposure windows to consider.
            </p>

            <p className="mt-4 text-xs text-[#7A837C]">
              ↳ Planning support, not an automatic decision. You make the final
              call.
            </p>
          </div>

          {/* Current air */}
          <div className="min-w-[190px] border-l border-[#DDE4DE] pl-10 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1597D3]">
              MEASURED · 09:00
            </p>

            <div className="mt-3 text-5xl font-medium tracking-[-0.04em]">
              31
              <span className="ml-2 text-lg font-normal text-[#59645C]">
                µg/m³
              </span>
            </div>

            <p className="mt-3 text-sm text-[#59645C]">
              PM2.5 · Moderate conditions
            </p>

            <p className="mt-2 text-sm text-[#59645C]">↓ Improving</p>
          </div>
        </section>

        {/* Air quality timeline */}
        <DayAtGlance />

        {/* Outdoor schedule + selected activity */}
        <OutdoorSchedule />
      </div>
    </main>
  );
}
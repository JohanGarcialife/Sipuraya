"use client";

type HebrewDateBadgeProps = {
  dayHe: string;
  monthHe: string;
  className?: string;
};

export default function HebrewDateBadge({
  dayHe,
  monthHe,
  className = "",
}: HebrewDateBadgeProps) {
  return (
    <div
      className={`inline-flex min-w-14 flex-col items-center justify-center rounded-xl bg-linear-to-br from-[var(--reader-accent)] to-[oklch(0.68_0.12_60)] px-3 py-2 font-serif font-bold leading-none text-[var(--reader-accent-foreground)] shadow-sm md:min-w-12 md:rounded-lg md:px-2.5 md:py-1.5 ${className}`}
      style={{ fontFamily: "var(--font-hebrew), serif" }}
    >
      <span className="text-[1.3rem] md:text-[1.1rem] sm:text-[0.95rem]">{dayHe}</span>
      <span className="text-[0.7rem] font-medium opacity-85 md:text-[0.6rem] sm:text-[0.55rem]">
        {monthHe}
      </span>
    </div>
  );
}

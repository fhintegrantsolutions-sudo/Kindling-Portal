"use client";

import { useEffect, useState } from "react";

// Counts down to a target date (YYYY-MM-DD). Treats midnight local-time as
// the target moment — matches the "12:01am the next day" cutover used by
// getOpportunities. Returns text like "in 5d 14h 22m" or "in 30s".
//
// Two modes:
//   mode="open"  — counting down to a note opening (start of that day)
//   mode="close" — counting down to funding closing (end of that day)
//
// For "close", the target is the END of funding_end_date (i.e., midnight at
// the start of the *next* day) so the closing day itself reads "closes
// today" and rolls to "closed" overnight.
export function Countdown({
  target,
  mode = "open",
  prefix = "in",
  expiredText = "now",
}: {
  target: string;
  mode?: "open" | "close";
  prefix?: string;
  expiredText?: string;
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const targetMs = (() => {
    const [y, m, d] = target.split("-").map((s) => parseInt(s, 10));
    if (mode === "close") {
      // End of close day = start of next day, local time.
      return new Date(y, m - 1, d + 1, 0, 0, 0, 0).getTime();
    }
    // Start of open day, local time.
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  })();

  const diffMs = targetMs - now;
  if (diffMs <= 0) {
    return <span className="font-medium">{expiredText}</span>;
  }

  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  let text: string;
  if (days >= 1) {
    text = `${days}d ${hours}h ${minutes}m`;
  } else if (hours >= 1) {
    text = `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes >= 1) {
    text = `${minutes}m ${seconds}s`;
  } else {
    text = `${seconds}s`;
  }

  return (
    <span>
      {prefix} <span className="font-medium tabular-nums">{text}</span>
    </span>
  );
}

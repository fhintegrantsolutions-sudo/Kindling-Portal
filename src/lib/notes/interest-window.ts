// The "interested" stage for upcoming notes: lenders can flag interest from
// INTEREST_WINDOW_DAYS before a note's funding opens until it opens.
export const INTEREST_WINDOW_DAYS = 30;

// YYYY-MM-DD the interest window opens for a funding start date.
export function interestOpensOn(fundingStart: string): string {
  const [y, m, d] = fundingStart.split("-").map((s) => parseInt(s, 10));
  const dt = new Date(Date.UTC(y, m - 1, d - INTEREST_WINDOW_DAYS));
  return dt.toISOString().slice(0, 10);
}

// Today's date (YYYY-MM-DD) in US Pacific, the portal's business day.
export function todayPacific(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(new Date());
}

// True while lenders can register interest: on/after the window opens and
// before funding opens.
export function isInterestWindowOpen(
  fundingStart: string | null,
  today: string = todayPacific(),
): boolean {
  if (!fundingStart) return false;
  return today >= interestOpensOn(fundingStart) && today < fundingStart;
}

// This business runs on Pakistan Standard Time (UTC+5, no daylight saving). We anchor "what
// calendar day is it" to that fixed offset explicitly, rather than the browser's or server's
// ambient timezone setting — that ambient setting is what caused dates to save a day early:
// new Date().toISOString().split('T')[0] converts to UTC first, so for the first ~5 hours of
// every Pakistani day (00:00-05:00 PKT) it silently produced yesterday's date instead.
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

function pakistanDateParts(ms: number) {
    const shifted = new Date(ms + PKT_OFFSET_MS);
    return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}

function formatDateParts({ year, month, day }: { year: number; month: number; day: number }): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Date pickers (<input type="date">) only send a calendar date (no time), which JS parses
// as UTC midnight. If that resolves to today (in Pakistan time), use the real current
// timestamp instead — otherwise a same-day entry recorded after a cash deposit would appear
// to have happened *before* it (00:00 < deposit time), silently dropping it out of the
// "since last deposit" cash-in-hand window.
export function resolveTransactionDate(dateStr?: string): Date {
    const now = new Date();
    if (!dateStr) return now;
    const picked = new Date(dateStr);
    const pickedParts = pakistanDateParts(picked.getTime());
    const nowParts = pakistanDateParts(now.getTime());
    const isToday = pickedParts.year === nowParts.year && pickedParts.month === nowParts.month && pickedParts.day === nowParts.day;
    return isToday ? now : picked;
}

// Default value for an <input type="date"> that should show "today" — computed from Pakistan
// time explicitly, so it's correct regardless of what timezone the browser or server happens
// to be set to.
export function todayDateInputValue(): string {
    return formatDateParts(pakistanDateParts(Date.now()));
}

// Recovers the "YYYY-MM-DD" an <input type="date"> should show when editing a previously
// saved date, anchored to Pakistan time. resolveTransactionDate stores backdated picks as UTC
// midnight of the chosen day, which round-trips back to the same day under this same offset.
// "Today" picks are stored as a real live timestamp, which this converts to the Pakistan
// calendar day it was actually recorded on.
export function dateInputValue(date: Date | string): string {
    return formatDateParts(pakistanDateParts(new Date(date).getTime()));
}

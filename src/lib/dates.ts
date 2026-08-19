// Date pickers (<input type="date">) only send a calendar date (no time), which JS parses
// as UTC midnight. If that resolves to today, use the real current timestamp instead —
// otherwise a same-day entry recorded after a cash deposit would appear to have happened
// *before* it (00:00 < deposit time), silently dropping it out of the "since last deposit"
// cash-in-hand window.
export function resolveTransactionDate(dateStr?: string): Date {
    const now = new Date();
    if (!dateStr) return now;
    const picked = new Date(dateStr);
    const isToday = picked.getUTCFullYear() === now.getUTCFullYear()
        && picked.getUTCMonth() === now.getUTCMonth()
        && picked.getUTCDate() === now.getUTCDate();
    return isToday ? now : picked;
}

/**
 * Format a duration in milliseconds to human readable string
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "-";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format a timestamp to locale string
 * @param date - Date string, Date object, or null/undefined
 * @param options - Intl.DateTimeFormat options (defaults to short format)
 */
export function formatTimestamp(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  // Default to short format: "Jan 1, 12:00 PM"
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return d.toLocaleString("en-US", options ?? defaultOptions);
}

/**
 * Format a timestamp to full locale string (date + time)
 */
export function formatTimestampFull(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

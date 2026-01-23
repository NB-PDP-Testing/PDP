/**
 * Format date as "Monday Jan 22, 10:30 PM"
 * Used consistently across all voice notes tabs
 */
export function formatVoiceNoteDate(date: Date | string | number): string {
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;

  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format date as short version "Mon Jan 22, 10:30 PM"
 * For compact displays
 */
export function formatVoiceNoteDateShort(date: Date | string | number): string {
  const d =
    typeof date === "string" || typeof date === "number"
      ? new Date(date)
      : date;

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

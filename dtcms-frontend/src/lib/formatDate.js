// Formats a Prisma DateTime/Date value (arrives as a full ISO timestamp,
// e.g. "1990-01-01T00:00:00.000Z") as a plain date for display. Several
// pages were rendering the raw ISO string directly, showing a spurious
// midnight timestamp for fields that are conceptually just a date
// (dateOfBirth, dateFrom/dateTo, etc).
export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}
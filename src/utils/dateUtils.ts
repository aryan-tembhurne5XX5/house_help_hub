// ─── Date Formatting Utilities ──────────────────────────────────────────────
// Safely format dates from various backend formats (epoch, ISO, raw strings).
// Never render raw timestamps in the UI.

/**
 * Safely parse a date value from various formats.
 * Handles: epoch (number or numeric string), ISO strings, date strings.
 */
function safeParse(value: string | number | Date | null | undefined): Date | null {
  if (!value) return null;

  // Already a Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Numeric epoch (milliseconds)
  if (typeof value === 'number') {
    return new Date(value);
  }

  // String that is purely numeric (epoch as string)
  if (typeof value === 'string' && /^\d{10,13}$/.test(value.trim())) {
    const num = parseInt(value.trim());
    // If 10 digits, treat as seconds; if 13, milliseconds
    return new Date(num < 1e12 ? num * 1000 : num);
  }

  // Try parsing as ISO / date string
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format a date to "19 Jun 2026"
 */
export function formatDate(value: string | number | Date | null | undefined): string {
  const date = safeParse(value);
  if (!date) return 'N/A';

  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format a date to "19 Jun 2026, 12:00 PM"
 */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const date = safeParse(value);
  if (!date) return 'N/A';

  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

/**
 * Format separate date + time strings into a readable format.
 * dateStr: "2026-06-19" or epoch
 * timeStr: "14:00" or "14:00:00"
 * Output: "19 Jun 2026, 2:00 PM"
 */
export function formatBookingDateTime(
  dateStr: string | number | null | undefined,
  timeStr: string | null | undefined
): string {
  // If dateStr is an epoch, format it directly (it already contains time info)
  if (dateStr && typeof dateStr === 'string' && /^\d{10,13}$/.test(dateStr.trim())) {
    return formatDateTime(dateStr);
  }
  if (typeof dateStr === 'number') {
    return formatDateTime(dateStr);
  }

  // Parse the date part
  const datePart = safeParse(dateStr);
  if (!datePart) return 'N/A';

  const day = datePart.getDate();
  const month = MONTHS[datePart.getMonth()];
  const year = datePart.getFullYear();

  // Parse the time part
  if (!timeStr) return `${day} ${month} ${year}`;

  const timeParts = timeStr.split(':');
  let hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1] || '0', 10);

  if (isNaN(hours)) return `${day} ${month} ${year}`;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const formattedMinutes = minutes.toString().padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${formattedMinutes} ${ampm}`;
}

/**
 * Format a relative time like "2 hours ago", "just now", etc.
 */
export function formatRelativeTime(value: string | number | Date | null | undefined): string {
  const date = safeParse(value);
  if (!date) return 'recently';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(value);
}

/**
 * Get status color class for booking status badges.
 */
export function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'accepted':
    case 'confirmed':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'cancelled':
      return 'bg-gray-100 text-gray-600 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-300';
  }
}

/**
 * Get display label for booking status.
 */
export function getStatusLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'Pending';
    case 'accepted':
    case 'confirmed':
      return 'Accepted';
    case 'completed':
      return 'Completed';
    case 'rejected':
      return 'Rejected';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status || 'Unknown';
  }
}

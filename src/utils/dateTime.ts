/**
 * Format a timestamp to a readable time string (HH:MM:SS AM/PM)
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

/**
 * Format a timestamp to a readable date string (MMM DD, YYYY)
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
};

/**
 * Format a timestamp to a full datetime string (MMM DD, YYYY HH:MM AM/PM)
 */
export const formatDateTime = (timestamp: number): string => {
  return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
};

/**
 * Format duration in seconds to MM:SS format
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format duration in seconds to a readable string (e.g., "1m 30s")
 */
export const formatDurationReadable = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins === 0) {
    return `${secs}s`;
  }

  return `${mins}m ${secs}s`;
};

/**
 * Format interval in seconds to a readable string (e.g., "5 min apart")
 */
export const formatInterval = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);

  if (mins < 1) {
    return `${seconds}s apart`;
  }

  if (mins === 1) {
    return '1 min apart';
  }

  return `${mins} min apart`;
};

/**
 * Get relative time string (e.g., "2 minutes ago", "just now")
 */
export const getRelativeTime = (timestamp: number): string => {
  const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);

  if (secondsAgo < 60) {
    return 'just now';
  }

  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) {
    return `${minutesAgo} ${minutesAgo === 1 ? 'minute' : 'minutes'} ago`;
  }

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return `${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago`;
  }

  const daysAgo = Math.floor(hoursAgo / 24);
  return `${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`;
};

/**
 * Parse a time string (HH:MM) to hours and minutes
 */
export const parseTimeString = (timeString: string): { hours: number; minutes: number } | null => {
  const match = timeString.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return { hours, minutes };
};

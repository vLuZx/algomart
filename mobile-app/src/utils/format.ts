/**
 * Format Utilities
 * Currency, dates, numbers
 */

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format date timestamp
 */
export function formatDate(timestamp: number | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time timestamp
 */
export function formatTime(timestamp: number | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format datetime timestamp
 */
export function formatDateTime(timestamp: number | string): string {
  return `${formatDate(timestamp)} at ${formatTime(timestamp)}`;
}

/**
 * Format large numbers (1000 -> 1K)
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format sales rank with category
 */
export function formatSalesRank(rank: number, category: string): string {
  return `#${formatNumber(rank)} in ${category}`;
}

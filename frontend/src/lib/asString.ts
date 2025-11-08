/**
 * Utility to safely convert various types to string
 * Useful for Next.js params and search params handling
 */
export function asString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

/**
 * Convert value to number, with fallback
 */
export function asNumber(value: string | string[] | undefined, fallback: number = 0): number {
  const str = asString(value);
  const num = parseInt(str, 10);
  return isNaN(num) ? fallback : num;
}

/**
 * Convert value to boolean
 */
export function asBoolean(value: string | string[] | undefined): boolean {
  const str = asString(value).toLowerCase();
  return str === 'true' || str === '1' || str === 'yes';
}

export default asString;
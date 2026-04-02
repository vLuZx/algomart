/**
 * Validation Utilities
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): boolean {
  // At least 8 characters
  return password.length >= 8;
}

/**
 * Validate required field
 */
export function isRequired(value: string): boolean {
  return value.trim().length > 0;
}

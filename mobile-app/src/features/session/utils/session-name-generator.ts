/**
 * Session Name Generator
 * Auto-generate human-readable session names
 */

/**
 * Generate a numbered session name
 * Format: "Session 1", "Session 2", etc.
 */
export function generateSessionName(existingSessionCount: number = 0): string {
  return `Session ${existingSessionCount + 1}`;
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

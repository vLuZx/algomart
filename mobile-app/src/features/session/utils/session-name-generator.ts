/**
 * Session Name Generator
 * Auto-generate human-readable session names
 */

/**
 * Generate a session name based on current date/time
 * Format: "Session Mar 15, 2:30 PM"
 */
export function generateSessionName(): string {
  const now = new Date();
  
  const month = now.toLocaleString('en-US', { month: 'short' });
  const day = now.getDate();
  const time = now.toLocaleString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  return `Session ${month} ${day}, ${time}`;
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

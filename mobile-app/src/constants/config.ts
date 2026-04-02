/**
 * App Configuration
 * Environment-specific settings
 */

// Backend API configuration
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000'  // Development
  : 'https://api.algomart.com';  // Production (update when deployed)

export const API_TIMEOUT = 30000; // 30 seconds

// Scanner configuration
export const SCAN_DEBOUNCE_MS = 1000; // 1 second between scans
export const DUPLICATE_SCAN_TOAST_DURATION = 2000; // 2 seconds

// Session configuration
export const MAX_PRODUCTS_PER_SESSION = 1000;
export const PRODUCTS_PER_PAGE = 25;

// Camera configuration
export const CAMERA_FPS = 60;
export const BARCODE_TYPES = ['ean-13', 'upc-a', 'upc-e'] as const;

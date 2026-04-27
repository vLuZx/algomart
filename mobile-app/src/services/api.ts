import axios from 'axios';
import Constants from 'expo-constants';

const SERVER_PORT = 3000;
const PROD_BASE_URL = 'https://algomart-production.up.railway.app';

/**
 * Resolve the server base URL.
 *
 * Priority:
 *   1. `extra.apiBaseUrl`   — explicit override from app.config.ts / env
 *   2. `extra.serverHost`   — Metro packager host (LAN dev): http://HOST:3000
 *   3. PROD_BASE_URL        — production Railway deployment
 *
 * On a native dev build (`expo run:ios --device`) `Constants.expoConfig`
 * may be missing; fall back to `manifest2` / `manifest` before giving up.
 */
function readExtra(): { apiBaseUrl?: string | null; serverHost?: string | null } {
  const c = Constants as unknown as {
    expoConfig?: { extra?: Record<string, unknown> } | null;
    manifest2?: { extra?: { expoClient?: { extra?: Record<string, unknown> } } } | null;
    manifest?: { extra?: Record<string, unknown> } | null;
  };
  const extra =
    c.expoConfig?.extra ??
    c.manifest2?.extra?.expoClient?.extra ??
    c.manifest?.extra ??
    {};
  return extra as { apiBaseUrl?: string | null; serverHost?: string | null };
}

function getBaseUrl(): string {
  const extra = readExtra();
  if (typeof extra.apiBaseUrl === 'string' && extra.apiBaseUrl.length > 0) {
    return extra.apiBaseUrl;
  }
  if (typeof extra.serverHost === 'string' && extra.serverHost.length > 0) {
    return `http://${extra.serverHost}:${SERVER_PORT}`;
  }
  return PROD_BASE_URL;
}

export const API_BASE_URL = getBaseUrl();
// eslint-disable-next-line no-console
console.log('[api] baseURL =', API_BASE_URL);

// CHANGE LATER, for now we'll keep it.
const API_TOKEN = "AlgoA|qH3PCpmoeIi53r/HZmEeFTzxcWVOifBHAtRSpPMDsNox12zadERFnQtIDqdugTMkuwMqo9k4xGjsyqC/fH5PNg==923js01HAV61";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  if (API_TOKEN) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${API_TOKEN}`;
  }
  return config;
});

export async function pingServerHealth(): Promise<void> {
  await api.get('/health');
}

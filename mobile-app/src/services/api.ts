/**
 * Base HTTP client for backend communication.
 *
 * In dev the URL comes from REACT_NATIVE_PACKAGER_HOSTNAME,
 * passed through app.config.ts → Constants.expoConfig.extra.serverHost.
 * Start Metro with:
 *   REACT_NATIVE_PACKAGER_HOSTNAME=$(ipconfig getifaddr en0) pnpm expo start --clear
 */

import axios from 'axios';
import Constants from 'expo-constants';

const SERVER_PORT = 3000;

function getBaseUrl(): string {
  if (process.env.API_URL) {
    return process.env.API_URL;
  }

  // Read the LAN IP that was set when Metro started
  const serverHost = Constants.expoConfig?.extra?.serverHost as string | null;
  if (serverHost && serverHost !== 'localhost' && serverHost !== '127.0.0.1') {
    return `http://${serverHost}:${SERVER_PORT}`;
  }

  // Fallback for simulator
  return `http://localhost:${SERVER_PORT}`;
}

export const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15_000,
});

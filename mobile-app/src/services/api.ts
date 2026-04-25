import axios from 'axios';
import Constants from 'expo-constants';

const SERVER_PORT = 3000;

function getBaseUrl(): string {
  return 'https://algomart-production.up.railway.app';
}

export const API_BASE_URL = getBaseUrl();

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

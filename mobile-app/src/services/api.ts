import axios from 'axios';
import Constants from 'expo-constants';

const SERVER_PORT = 3000;

function getBaseUrl(): string {
  return 'https://algomart-production.up.railway.app';
}

export const API_BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
});

export async function pingServerHealth(): Promise<void> {
  await api.get('/health');
}

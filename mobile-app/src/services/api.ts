import axios from 'axios';
import Constants from 'expo-constants';

const SERVER_PORT = 3000;

function getBaseUrl(): string {
  return 'https://algomart-production.up.railway.app';
}

export const API_BASE_URL = getBaseUrl();

const API_TOKEN =
  (Constants.expoConfig?.extra?.apiToken as string | undefined) ??
  (Constants.manifest2?.extra?.expoClient?.extra?.apiToken as string | undefined) ??
  process.env.API_TOKEN;

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

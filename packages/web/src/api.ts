import { apiClient } from './apiClient.js';
import { mockClient } from './mockData.js';

// Set VITE_MOCK=true in .env.local to run without a backend.
export const api = import.meta.env.VITE_MOCK === 'true' ? mockClient : apiClient;

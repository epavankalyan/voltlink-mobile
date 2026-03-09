import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Validate required environment variables at startup
// ---------------------------------------------------------------------------
const API_URL = process.env.EXPO_PUBLIC_API_URL as string;
const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT ?? '10000', 10);

if (!API_URL) {
    throw new Error(
        '[api.service] EXPO_PUBLIC_API_URL is not set.\n' +
        'Copy .env.example to .env and set the backend URL before starting the app.'
    );
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
export const apiClient: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: API_TIMEOUT,
});

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token from secure storage
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — centralised error handling
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const method = error.config?.method?.toUpperCase() ?? 'UNKNOWN';
        const url = error.config?.url ?? '';
        const status = error.response?.status;

        if (status === 401) {
            // TODO: dispatch a logout / redirect-to-login action
            AsyncStorage.removeItem('auth_token');
        }

        return Promise.reject(error);
    }
);

// ---------------------------------------------------------------------------
// Caching Layer
// ---------------------------------------------------------------------------
interface CacheEntry {
    data: any;
    timestamp: number;
}

const reqCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const fetchWithCache = async (url: string, config?: AxiosRequestConfig & { forceRefresh?: boolean }) => {
    const { forceRefresh, ...axiosConfig } = config || {};
    const cacheKey = `${url}?${new URLSearchParams(axiosConfig.params || {}).toString()}`;

    if (!forceRefresh) {
        const cached = reqCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.data;
        }
    }

    const response = await apiClient.get(url, axiosConfig);
    reqCache.set(cacheKey, { data: response.data, timestamp: Date.now() });

    return response.data;
};


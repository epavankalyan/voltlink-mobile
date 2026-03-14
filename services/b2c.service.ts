import { apiClient, fetchWithCache } from './api.service';

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '5';
const DEFAULT_LAT = parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LAT ?? '12.9716');
const DEFAULT_LNG = parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LNG ?? '77.5946');

export const getB2CStats = async (userId: string = DEFAULT_USER_ID, forceRefresh?: boolean) => {
    const [user, balance, sustainability, sessions] = await Promise.all([
        fetchWithCache(`/users/${userId}`, { forceRefresh }).catch(() => ({})),
        fetchWithCache(`/users/${userId}/energy-credits/balance`, { forceRefresh }).catch(() => ({ current_balance: 0 })),
        fetchWithCache(`/users/${userId}/sustainability`, { forceRefresh }).catch(() => ({ carbon_saved_kg: 0 })),
        fetchWithCache(`/users/${userId}/sessions`, { forceRefresh }).catch(() => [])
    ]);

    return {
        user: user,
        vehicle: user?.vehicle || null,
        availableCredits: balance?.current_balance || 0,
        carbonSavedKg: sustainability?.carbon_saved_kg || 0,
        totalSessions: Array.isArray(sessions) ? sessions.length : 0,
    };
};

export const getCreditBalance = async (userId: string = DEFAULT_USER_ID) =>
    apiClient.get(`/users/${userId}/energy-credits/balance`).then(res => res.data);

export const getCreditTransactions = async (userId: string = DEFAULT_USER_ID, page = 1, pageSize = 20) =>
    apiClient
        .get(`/users/${userId}/energy-credits/ledger`, { params: { page, page_size: pageSize } })
        .then(res => (res.data?.entries ?? []) as any[]);

export const transferCredits = async (
    userId: string = DEFAULT_USER_ID,
    payload: { recipient_user_id: number; amount: number; energy_source_id?: string; description?: string }
) => apiClient.post(`/users/${userId}/energy-credits/transfer`, payload).then(res => res.data);

export const getSustainabilityStats = async (userId: string = DEFAULT_USER_ID, forceRefresh?: boolean) =>
    fetchWithCache(`/users/${userId}/sustainability`, { forceRefresh }).then(data => ({
        greenScore: data.green_score,
        carbonSavedKg: data.carbon_saved_kg,
        renewablePercent: data.renewable_percent,
        carbonRank: data.carbon_rank,
    }));

export const getUserSessions = async (userId: string = DEFAULT_USER_ID, status?: string, forceRefresh?: boolean) =>
    fetchWithCache(`/users/${userId}/sessions`, { params: { status }, forceRefresh }).then(data => {
        // Handle both bare array and wrapped { data: [...] } responses
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    });

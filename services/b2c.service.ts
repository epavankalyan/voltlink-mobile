import { apiClient, fetchWithCache } from './api.service';

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '11';
const DEFAULT_LAT = parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LAT ?? '12.9716');
const DEFAULT_LNG = parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LNG ?? '77.5946');

export const getB2CStats = async (userId: string = DEFAULT_USER_ID, forceRefresh?: boolean) =>
    fetchWithCache(`/users/${userId}/profile`, { forceRefresh }).then(data => ({
        ...data,
        availableCredits: data.credit_account?.current_balance,
    }));

export const getCreditTransactions = async (userId: string = DEFAULT_USER_ID, forceRefresh?: boolean) =>
    fetchWithCache(`/users/${userId}/credits`, { forceRefresh }).then(data => {
        const transactions = data.transactions || [];
        return transactions.map((t: any) => ({
            id: t.id.toString(),
            amount: t.credit_amount,
            description: t.description,
            date: t.created_at,
            type: t.credit_amount >= 0 ? 'earned' : 'spent',
        }));
    });

export const getB2CRecommendations = async (forceRefresh?: boolean) =>
    fetchWithCache('/live-rates', { params: { lat: DEFAULT_LAT, lng: DEFAULT_LNG }, forceRefresh });

export const getSustainabilityStats = async (userId: string = DEFAULT_USER_ID, forceRefresh?: boolean) =>
    fetchWithCache(`/users/${userId}/sustainability`, { forceRefresh }).then(data => ({
        greenScore: data.green_score,
        carbonSavedKg: data.carbon_saved_kg,
        renewablePercent: data.renewable_percent,
        carbonRank: data.carbon_rank,
    }));

export const getUserSessions = async (userId: string = DEFAULT_USER_ID, status?: string, forceRefresh?: boolean) =>
    fetchWithCache(`/users/${userId}/sessions`, { params: { status }, forceRefresh });

export const getUserBookings = async (userId: string = DEFAULT_USER_ID, status?: string, forceRefresh?: boolean) =>
    fetchWithCache(`/users/${userId}/bookings`, { params: { status }, forceRefresh });

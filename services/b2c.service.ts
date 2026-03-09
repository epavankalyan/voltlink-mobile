import { apiClient } from './api.service';

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '11';
const DEFAULT_LAT = parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LAT ?? '12.9716');
const DEFAULT_LNG = parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LNG ?? '77.5946');

export const getB2CStats = async (userId: string = DEFAULT_USER_ID) =>
    apiClient.get(`/users/${userId}/profile`).then(res => ({
        ...res.data,
        availableCredits: res.data.credit_account?.current_balance,
    }));

export const getCreditTransactions = async (userId: string = DEFAULT_USER_ID) =>
    apiClient.get(`/users/${userId}/credits`).then(res => {
        const transactions = res.data.transactions || [];
        return transactions.map((t: any) => ({
            id: t.id.toString(),
            amount: t.credit_amount,
            description: t.description,
            date: t.created_at,
            type: t.credit_amount >= 0 ? 'earned' : 'spent',
        }));
    });

export const getB2CRecommendations = async () =>
    apiClient
        .get('/live-rates', { params: { lat: DEFAULT_LAT, lng: DEFAULT_LNG } })
        .then(res => res.data);

export const getSustainabilityStats = async (userId: string = DEFAULT_USER_ID) =>
    apiClient.get(`/users/${userId}/sustainability`).then(res => ({
        greenScore: res.data.green_score,
        carbonSavedKg: res.data.carbon_saved_kg,
        renewablePercent: res.data.renewable_percent,
        carbonRank: res.data.carbon_rank,
    }));

export const getUserSessions = async (userId: string = DEFAULT_USER_ID, status?: string) =>
    apiClient
        .get(`/users/${userId}/sessions`, { params: { status } })
        .then(res => res.data);

export const getUserBookings = async (userId: string = DEFAULT_USER_ID, status?: string) =>
    apiClient
        .get(`/users/${userId}/bookings`, { params: { status } })
        .then(res => res.data);

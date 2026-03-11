import { apiClient, fetchWithCache } from './api.service';

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '11';
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
        vehicles: user?.vehicles || [],
        availableCredits: balance?.current_balance || 0,
        carbonSavedKg: sustainability?.carbon_saved_kg || 0,
        totalSessions: Array.isArray(sessions) ? sessions.length : 0,
    };
};

export const getCreditTransactions = async (userId: string = DEFAULT_USER_ID, forceRefresh?: boolean) =>
    fetchWithCache(`/users/${userId}/energy-credits/ledger`, { forceRefresh }).then(data => {
        const transactions = data.items || [];
        return transactions.map((t: any) => ({
            id: t.id.toString(),
            amount: t.amount,
            description: t.reason,
            date: t.created_at,
            type: t.entry_type === 'credit' ? 'earned' : 'spent',
        }));
    });

export const getSustainabilityStats = async (userId: string = DEFAULT_USER_ID, forceRefresh?: boolean) =>
    fetchWithCache(`/users/${userId}/sustainability`, { forceRefresh }).then(data => ({
        greenScore: data.green_score,
        carbonSavedKg: data.carbon_saved_kg,
        renewablePercent: data.renewable_percent,
        carbonRank: data.carbon_rank,
    }));

export const getUserSessions = async (userId: string = DEFAULT_USER_ID, status?: string, forceRefresh?: boolean) =>
    fetchWithCache(`/users/${userId}/sessions`, { params: { status }, forceRefresh });

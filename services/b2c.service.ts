import { apiClient } from './api.service';

/**
 * Fetches B2C user statistics (credits, carbon saved, etc.)
 */
export const getB2CStats = async (userId: string = '11') => {
    return apiClient.get(`/b2c/users/${userId}/profile`).then(res => ({
        ...res.data,
        availableCredits: res.data.credit_account?.current_balance
    }));
};

export const getCreditTransactions = async (userId: string = '11') => {
    return apiClient.get(`/b2c/users/${userId}/credits`).then(res => {
        const transactions = res.data.transactions || [];
        return transactions.map((t: any) => ({
            id: t.id.toString(),
            amount: t.credit_amount,
            description: t.description,
            date: t.created_at,
            type: t.credit_amount >= 0 ? 'earned' : 'spent'
        }));
    });
};

export const getB2CRecommendations = async () => {
    return apiClient.get('/b2c/live-rates', { params: { lat: 12.9716, lng: 77.5946 } }).then(res => res.data);
};

export const getSustainabilityStats = async (userId: string = '11') => {
    return apiClient.get(`/b2c/users/${userId}/sustainability`).then(res => ({
        greenScore: res.data.green_score,
        carbonSavedKg: res.data.carbon_saved_kg,
        renewablePercent: res.data.renewable_percent,
        carbonRank: res.data.carbon_rank
    }));
};

/**
 * Fetches user sessions (active or completed)
 */
export const getUserSessions = async (userId: string = '11', status?: string) => {
    return apiClient.get(`/b2c/users/${userId}/active-session`, {
        params: { status }
    }).then(res => res.data);
};

export const getUserBookings = async (userId: string = '11', status?: string) => {
    return apiClient.get(`/users/${userId}/bookings`, {
        params: { status }
    }).then(res => res.data);
};

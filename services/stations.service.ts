import { apiClient } from './api.service';
import { Station } from '../types/station.types';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
};

// Default user location from env (fallback: Bangalore)
const USER_LAT = parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LAT ?? '12.9716');
const USER_LNG = parseFloat(process.env.EXPO_PUBLIC_DEFAULT_LNG ?? '77.5946');

export const getStations = async (params?: any): Promise<Station[]> =>
    apiClient.get('/charging-stations', { params }).then(res => {
        const stations = res.data.data || [];
        return stations.map((s: any) => {
            const dist = s.latitude && s.longitude
                ? calculateDistance(USER_LAT, USER_LNG, s.latitude, s.longitude)
                : 5.2;
            return {
                ...s,
                id: s.id.toString(),
                cpoName: s.operator_id || 'VoltLink Partner',
                chargerTypes: s.charging_types || [],
                availableChargers: s.available_chargers || 0,
                totalChargers: s.total_chargers || 0,
                distanceKm: dist,
                etaMinutes: Math.round(dist * 2.5),
                pricePerKwh: s.price_per_kwh || 0,
                coordinates: { latitude: s.latitude, longitude: s.longitude },
            };
        });
    });

export const getStationById = async (id: string): Promise<Station> =>
    apiClient.get(`/charging-stations/${id}`).then(res => {
        const d = res.data;
        const dist = d.latitude && d.longitude
            ? calculateDistance(USER_LAT, USER_LNG, d.latitude, d.longitude)
            : 5.2;
        return {
            ...d,
            id: d.id.toString(),
            cpoName: d.operator_id || 'VoltLink Partner',
            chargerTypes: [],
            distanceKm: dist,
            etaMinutes: Math.round(dist * 2.5),
            coordinates: { latitude: d.latitude, longitude: d.longitude },
        };
    });

export const getAIRecommendations = async (
    vehicleId: string = process.env.EXPO_PUBLIC_DEFAULT_VEHICLE_ID ?? 'VH001'
): Promise<Station[]> =>
    apiClient.get(`/vehicles/${vehicleId}/recommendations`).then(res => {
        const data = res.data || [];
        return data.map((s: any) => {
            const lat = s.evse?.latitude || s.latitude || USER_LAT;
            const lng = s.evse?.longitude || s.longitude || USER_LNG;
            const dist = calculateDistance(USER_LAT, USER_LNG, lat, lng);
            return {
                ...s,
                id: s.station_id || s.id?.toString(),
                name: s.station_name || s.name || 'AI Suggested Station',
                cpoName: s.operator_id || 'VoltLink Optimized',
                chargerTypes: s.charging_types || [],
                availableChargers: s.available_chargers ?? 1,
                totalChargers: s.total_chargers ?? 4,
                pricePerKwh: s.price_per_kwh || 0,
                effectivePrice: s.predicted_cost || s.price_per_kwh || 0,
                aiReason: s.reason_summary || s.ai_reason || 'Highly recommended for your route',
                distanceKm: dist,
                etaMinutes: Math.round(dist * 2.5),
                nextAvailableMinutes: s.predicted_wait_time || 0,
                coordinates: { latitude: lat, longitude: lng },
            };
        });
    });

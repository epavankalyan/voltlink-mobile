import { apiClient } from './api.service';

const DEFAULT_VEHICLE_ID = process.env.EXPO_PUBLIC_DEFAULT_VEHICLE_ID ?? 'VH001';
const DEFAULT_FLEET_ID = process.env.EXPO_PUBLIC_DEFAULT_FLEET_ID ?? '1';

export const getVehicleDashboard = async (vehicleId: string = DEFAULT_VEHICLE_ID) =>
    apiClient.get(`/vehicles/${vehicleId}/extended`).then(res => {
        const d = res.data.data;
        return {
            id: d.id,
            name: d.name || 'My EV',
            model: d.type || 'Nexon EV',
            licensePlate: 'KA 01 EV 1234',
            batteryLevel: d.battery?.percentage || 0,
            rangeKm: d.range?.estimated || 0,
            status: d.status as any,
            lastChargedAt: d.battery?.last_charged || 'Unknown',
            driverName: d.driver?.name || 'Driver',
            driverEmail: d.driver?.email || 'driver@voltlink.com',
        };
    });

export const getTodayStats = async (vehicleId: string = DEFAULT_VEHICLE_ID) =>
    apiClient.get(`/vehicles/${vehicleId}/extended`).then(res => {
        const d = res.data.data;
        return {
            distanceKm: 0,
            kwhConsumed: Math.round(
                (d.battery?.capacity_kwh || 0) * (d.battery?.percentage || 0) / 100 * 10
            ) / 10,
            costPerKwh: 12.0,
        };
    });

export const getNotifications = async (fleetId: string = DEFAULT_FLEET_ID) =>
    apiClient.get(`/fleets/${fleetId}/alerts`).then(res => res.data);

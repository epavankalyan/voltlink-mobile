import { apiClient } from './api.service';

const DEFAULT_FLEET_ID = process.env.EXPO_PUBLIC_DEFAULT_FLEET_ID ?? '1';

export const getVehicleDashboard = async (vehicleId: string) =>
    apiClient.get(`/vehicles/${vehicleId}/extended`).then(res => {
        const d = res.data.data || res.data;
        return {
            id: d.id,
            name: d.name || '',
            make: d.make || '',
            model: d.model || '',
            licensePlate: d.license_plate || d.vehicle_identifier || '',
            batteryLevel: d.battery?.percentage || 0,
            rangeKm: d.range?.estimated || 0,
            status: d.status as any,
            lastChargedAt: d.battery?.lastCharged || d.lastUpdate || 'Unknown',
            driverName: d.driver?.name || 'Driver',
            driverEmail: d.driver?.email || 'driver@voltlink.com',
        };
    });

export const getTodayStats = async (vehicleId: string) =>
    apiClient.get(`/vehicles/${vehicleId}/extended`).then(res => {
        const d = res.data.data || res.data;
        return {
            distanceKm: 0,
            kwhConsumed: Math.round(
                (d.battery?.capacity_kwh || 0) * (d.battery?.percentage || 0) / 100 * 10
            ) / 10,
            costPerKwh: 12.0,
        };
    });

export const getDriverSessions = async (
    fleetId: string = DEFAULT_FLEET_ID,
    vehicleId: string,
    status?: string,
) =>
    apiClient
        .get(`/fleets/${fleetId}/sessions`, {
            params: { vehicle_id: vehicleId, status },
        })
        .then(res => res.data?.data || []);

export const getNotifications = async (fleetId: string = DEFAULT_FLEET_ID) =>
    apiClient.get(`/fleets/${fleetId}/alerts`).then(res => res.data);

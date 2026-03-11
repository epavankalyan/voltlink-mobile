import { apiClient, fetchWithCache } from './api.service';

const DEFAULT_FLEET_ID = process.env.EXPO_PUBLIC_DEFAULT_FLEET_ID ?? '1';
const DEFAULT_DRIVER_ID = process.env.EXPO_PUBLIC_DEFAULT_DRIVER_ID ?? '4';

export const getDriverProfile = async (driverId: string = DEFAULT_DRIVER_ID, forceRefresh?: boolean) =>
    fetchWithCache(`/users/${driverId}`, { forceRefresh });

export const getVehiclesByDriver = async (driverId: string = DEFAULT_DRIVER_ID, forceRefresh?: boolean) =>
    fetchWithCache(`/users/${driverId}`, { forceRefresh }).then(data => {
        return data?.vehicles || [];
    });

export const getVehicleDashboard = async (vehicleId: string, forceRefresh?: boolean) =>
    fetchWithCache(`/vehicles/${vehicleId}/extended`, { forceRefresh }).then(data => {
        const d = data.data || data;
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

export const getTodayStats = async (vehicleId: string, forceRefresh?: boolean) =>
    fetchWithCache(`/vehicles/${vehicleId}/extended`, { forceRefresh }).then(data => {
        const d = data.data || data;
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
    forceRefresh?: boolean
) =>
    fetchWithCache(`/fleets/${fleetId}/sessions`, {
        params: { vehicle_id: vehicleId, status }, forceRefresh
    }).then(data => data?.data || []);


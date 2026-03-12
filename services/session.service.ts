import { apiClient } from './api.service';

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '11';

// ---------------------------------------------------------------------------
// Slot availability
// ---------------------------------------------------------------------------

export interface SlotInfo {
    time: string;
    available: boolean;
    price_per_kwh: number;
}

export interface ConnectorSlots {
    connector_id: string;
    connector_type: string;
    power_kw: number;
    slots: SlotInfo[];
}

/**
 * Get available time slots for each connector at a station on a given date.
 * Defaults to today if `date` is omitted.
 */
export const getStationSlots = async (
    stationId: string | number,
    date?: string,
): Promise<ConnectorSlots[]> =>
    apiClient
        .get(`/charging-stations/${stationId}/slots`, { params: { date } })
        .then(res => res.data);

// ---------------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------------

/**
 * Create a new charging session, optionally linked to a booking.
 * The backend will mark the booking as completed if booking_id is provided.
 */
export const createSession = async (data: {
    connector_id: string;
    vehicle_id: number;
    user_id: number;
    booking_id?: number;
}) => apiClient.post('/sessions', data).then(res => res.data);


/**
 * Get a single session by ID.
 */
export const getSession = async (sessionId: string) =>
    apiClient.get(`/sessions/${sessionId}`).then(res => res.data);

/**
 * Start a charging session (called when the user slides the slider).
 */
export const startSession = async (sessionId: string) =>
    apiClient.patch(`/sessions/${sessionId}/start`).then(res => res.data);

/**
 * Stop an active charging session.
 */
export const stopSession = async (sessionId: string) =>
    apiClient.patch(`/sessions/${sessionId}/stop`).then(res => res.data);

// ---------------------------------------------------------------------------
// Active session polling
// ---------------------------------------------------------------------------

export interface SessionRatingRequest {
    comment: string;
    rating: number;
    session_id: string;
    user_id: number;
}

/**
 * Submit feedback for a charging session.
 */
export const rateSession = async (stationId: string, data: SessionRatingRequest) =>
    apiClient.post(`/charging-stations/${stationId}/ratings`, data).then(res => res.data);

/**
 * Get the currently active session for a vehicle (or 404 if none).
 */
export const getVehicleActiveSession = async (vehicleId: string) =>
    apiClient.get(`/vehicles/${vehicleId}/session`).then(res => res.data);

/**
 * Get sessions for a user filtered by status (e.g. 'active', 'completed').
 */
export const getUserActiveSessions = async (
    userId: string = DEFAULT_USER_ID,
    status?: string,
    forceRefresh?: boolean
) =>
    apiClient
        .get(`/users/${userId}/sessions`, { params: { status }, ...({ forceRefresh } as any) })
        .then(res => res.data);


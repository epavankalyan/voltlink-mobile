export interface Booking {
    id: string;
    user_id: number;
    vehicle_id: string;
    connector_id: string;
    booking_time: string;
    status: string;
    created_at?: string;
    updated_at?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    page_size: number;
}

export interface CreateBookingRequest {
    user_id: number;
    vehicle_id: string;
    connector_id: string;
    booking_time: string;
}

export interface UpdateBookingRequest {
    booking_time?: string;
    status?: string;
}

export interface CancelBookingRequest {
    reason?: string;
}

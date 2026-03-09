import { apiClient } from './api.service';
import {
    Booking,
    PaginatedResponse,
    CreateBookingRequest,
    UpdateBookingRequest,
    CancelBookingRequest,
} from '../types/booking.types';

export const getBookings = async (params?: {
    user_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
}): Promise<PaginatedResponse<Booking>> => {
    return apiClient.get('/bookings', { params }).then(res => res.data);
};

export const createBooking = async (
    data: CreateBookingRequest
): Promise<Booking> => {
    return apiClient.post('/bookings', data).then(res => res.data);
};

export const getBookingById = async (id: string): Promise<Booking> => {
    return apiClient.get(`/bookings/${id}`).then(res => res.data);
};

export const updateBooking = async (
    id: string,
    data: UpdateBookingRequest
): Promise<Booking> => {
    return apiClient.put(`/bookings/${id}`, data).then(res => res.data);
};

export const deleteBooking = async (id: string): Promise<void> => {
    return apiClient.delete(`/bookings/${id}`).then(res => res.data);
};

export const cancelBooking = async (
    id: string,
    data?: CancelBookingRequest
): Promise<void> => {
    return apiClient.post(`/bookings/${id}/cancel`, data).then(res => res.data);
};

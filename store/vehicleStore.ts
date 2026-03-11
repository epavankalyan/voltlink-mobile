import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/api.service';

export interface FamilyVehicle {
    id: string;
    memberName: string;
    vehicleModel: string;
    batteryLevel: number;
    coordinates: {
        latitude: number;
        longitude: number;
    };
}

export interface MyVehicle {
    id: string;
    name: string;
    make?: string;
    model: string;
    licensePlate: string;
    batteryLevel: number;
    rangeKm: number;
    status: string;
    lastChargedAt: string;
}

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '11';

interface VehicleState {
    myVehicle: MyVehicle;
    currentVehicleId: string | null;
    familyVehicles: FamilyVehicle[];
    addFamilyVehicle: (vehicle: Omit<FamilyVehicle, 'id'>) => void;
    removeFamilyVehicle: (id: string) => void;
    updateMyVehicleBattery: (level: number) => void;
    setCurrentVehicleId: (id: string | null) => void;
    fetchMyVehicle: (vehicleId?: string | null) => Promise<void>;
    fetchFamilyVehicles: (userId?: string) => Promise<void>;
    addFamilyMemberApi: (data: { name: string; relation: string }) => Promise<void>;
    removeFamilyMemberApi: (memberId: string | number) => Promise<void>;
}

const EMPTY_VEHICLE: MyVehicle = {
    id: '',
    name: '',
    make: '',
    model: '',
    licensePlate: '',
    batteryLevel: 0,
    rangeKm: 0,
    status: 'Unknown',
    lastChargedAt: '',
};

export const useVehicleStore = create<VehicleState>()(
    persist(
        (set, get) => ({
            myVehicle: EMPTY_VEHICLE,
            currentVehicleId: null,
            familyVehicles: [],
            addFamilyVehicle: (v) => set((state) => ({
                familyVehicles: [...state.familyVehicles, { ...v, id: `fv${Date.now()}` }]
            })),
            removeFamilyVehicle: (id) => set((state) => ({
                familyVehicles: state.familyVehicles.filter((v) => v.id !== id)
            })),
            updateMyVehicleBattery: (level) => set((state) => ({
                myVehicle: { ...state.myVehicle, batteryLevel: level }
            })),
            setCurrentVehicleId: (id) => set({ currentVehicleId: id }),
            fetchMyVehicle: async (vehicleId?: string | null) => {
                try {
                    const id = vehicleId !== undefined ? vehicleId : get().currentVehicleId;
                    if (!id) {
                        set({ myVehicle: EMPTY_VEHICLE, currentVehicleId: null });
                        return;
                    }

                    const res = await apiClient.get(`/vehicles/${id}/extended`);
                    const d = res.data.data || res.data;
                    set({
                        myVehicle: {
                            id: d.id,
                            name: d.name || '',
                            make: d.make || '',
                            model: d.model || '',
                            licensePlate: d.license_plate || d.vehicle_identifier || '',
                            batteryLevel: d.battery?.percentage ?? 0,
                            rangeKm: d.range?.estimated ?? 0,
                            status: d.status || 'Unknown',
                            lastChargedAt: d.battery?.lastCharged || d.lastUpdate || '',
                        },
                    });
                } catch (error) {
                    console.error('Error fetching vehicle data:', error);
                    set({ myVehicle: EMPTY_VEHICLE });
                }
            },
            fetchFamilyVehicles: async (userId?: string) => {
                try {
                    const id = userId || DEFAULT_USER_ID;
                    const res = await apiClient.get(`/users/${id}/family`);
                    const data = res.data || [];
                    set({
                        familyVehicles: data.map((m: any) => ({
                            id: String(m.id),
                            memberName: m.name,
                            vehicleModel: m.vehicle_model,
                            batteryLevel: m.battery_level,
                            coordinates: m.coordinates
                        }))
                    });
                } catch (error) {
                    console.error('Error fetching family:', error);
                    set({ familyVehicles: [] });
                }
            },
            addFamilyMemberApi: async (data) => {
                try {
                    const id = DEFAULT_USER_ID;
                    await apiClient.post(`/users/${id}/family`, data);
                    await get().fetchFamilyVehicles(id);
                } catch (error) {
                    console.error('Error adding family member:', error);
                    throw error;
                }
            },
            removeFamilyMemberApi: async (memberId) => {
                try {
                    const id = DEFAULT_USER_ID;
                    await apiClient.delete(`/users/${id}/family/${memberId}`);
                    await get().fetchFamilyVehicles(id);
                } catch (error) {
                    console.error('Error removing family member:', error);
                }
            }
        }),
        {
            name: 'vehicle-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

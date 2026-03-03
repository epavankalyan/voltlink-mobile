import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    model: string;
    licensePlate: string;
    batteryLevel: number;
    rangeKm: number;
    status: string;
    lastChargedAt: string;
}

interface VehicleState {
    myVehicle: MyVehicle;
    familyVehicles: FamilyVehicle[];
    addFamilyVehicle: (vehicle: Omit<FamilyVehicle, 'id'>) => void;
    removeFamilyVehicle: (id: string) => void;
    updateMyVehicleBattery: (level: number) => void;
}

const INITIAL_MY_VEHICLE: MyVehicle = {
    id: 'bv1',
    name: 'Tata Nexon EV',
    model: 'Nexon EV Max',
    licensePlate: 'DL 5C AB 1234',
    batteryLevel: 54,
    rangeKm: 135,
    status: 'Idle',
    lastChargedAt: new Date(Date.now() - 7200000).toISOString(),
};

export const useVehicleStore = create<VehicleState>()(
    persist(
        (set, get) => ({
            myVehicle: INITIAL_MY_VEHICLE,
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
            // Default coordinates for Bangalore
            getWithCoords: () => {
                const { familyVehicles } = get() as any;
                return familyVehicles.map((v: any) => ({
                    ...v,
                    coordinates: v.coordinates || { latitude: 12.9716, longitude: 77.5946 }
                }));
            }
        }),
        {
            name: 'vehicle-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

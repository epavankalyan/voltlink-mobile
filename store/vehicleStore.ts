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

export const INITIAL_FAMILY: FamilyVehicle[] = [
    { id: 'fv1', memberName: 'Rohan', vehicleModel: 'Nexon EV', batteryLevel: 72, coordinates: { latitude: 28.502, longitude: 77.092 } },
    { id: 'fv2', memberName: 'Ananya', vehicleModel: 'MG ZS EV', batteryLevel: 31, coordinates: { latitude: 28.485, longitude: 77.098 } },
    { id: 'fv3', memberName: 'Mom', vehicleModel: 'Tiago EV', batteryLevel: 88, coordinates: { latitude: 28.498, longitude: 77.075 } },
];

export const useVehicleStore = create<VehicleState>()(
    persist(
        (set, get) => ({
            myVehicle: INITIAL_MY_VEHICLE,
            familyVehicles: INITIAL_FAMILY,
            addFamilyVehicle: (v) => set((state) => ({
                familyVehicles: [...state.familyVehicles, { ...v, id: `fv${Date.now()}` }]
            })),
            removeFamilyVehicle: (id) => set((state) => ({
                familyVehicles: state.familyVehicles.filter((v) => v.id !== id)
            })),
            updateMyVehicleBattery: (level) => set((state) => ({
                myVehicle: { ...state.myVehicle, batteryLevel: level }
            })),
            // Ensure persisted vehicles have coords
            getWithCoords: () => {
                const { familyVehicles } = get() as any;
                return familyVehicles.map((v: any, i: number) => ({
                    ...v,
                    coordinates: v.coordinates || INITIAL_FAMILY[i]?.coordinates || { latitude: 28.495, longitude: 77.088 }
                }));
            }
        }),
        {
            name: 'vehicle-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

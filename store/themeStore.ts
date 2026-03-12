import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ThemeState {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'dark',
            toggleTheme: () => set({ theme: 'dark' }),
        }),
        {
            name: 'voltlink-theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
            merge: (_persistedState, currentState) => ({
                ...currentState,
                theme: 'dark' as const,
            }),
        }
    )
);

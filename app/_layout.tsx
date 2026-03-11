import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useThemeStore } from '../store/themeStore';
import { useRoleStore } from '../store/roleStore';
import { COLORS } from '../utils/theme';

export default function RootLayout() {
    const { theme } = useThemeStore();
    const { activeRole } = useRoleStore();
    const segments = useSegments();
    const router = useRouter();
    const isDark = theme === 'dark';
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        setIsReady(true);
    }, []);

    useEffect(() => {
        if (!isReady) return;

        const inDriverGroup = segments[0] === 'driver';
        const inB2CGroup = segments[0] === 'b2c';

        if (!activeRole && (inDriverGroup || inB2CGroup)) {
            // Need a role to access these groups
            router.replace('/');
        } else if (activeRole && !inDriverGroup && !inB2CGroup) {
            // If at root but has role, go to dashboard
            router.replace(activeRole === 'driver' ? '/driver/dashboard' : '/b2c/dashboard');
        } else if (activeRole === 'driver' && inB2CGroup) {
            // Mismatch: Driver trying to access B2C
            router.replace('/driver/dashboard');
        } else if (activeRole === 'b2c' && inDriverGroup) {
            // Mismatch: B2C trying to access Driver
            router.replace('/b2c/dashboard');
        }
    }, [activeRole, segments, isReady]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: isDark ? COLORS.darkBg : COLORS.lightBg }]}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: {
                            backgroundColor: isDark ? COLORS.darkBg : COLORS.lightBg,
                        },
                        animation: 'fade',
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="driver" options={{ headerShown: false }} />
                    <Stack.Screen name="b2c" options={{ headerShown: false }} />
                </Stack>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

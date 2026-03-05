import React, { useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileView } from '../../components/profile/ProfileView';
import { COLORS } from '../../utils/theme';
import { useThemeStore } from '../../store/themeStore';
import { getVehicleDashboard } from '../../services/driver.service';
import { Vehicle } from '../../types/vehicle.types';

import { useVehicleStore } from '../../store/vehicleStore';

export default function DriverProfile() {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const { currentVehicleId } = useVehicleStore();

    useEffect(() => {
        if (!currentVehicleId) return;
        getVehicleDashboard(currentVehicleId)
            .then(setVehicle)
            .finally(() => setLoading(false));
    }, [currentVehicleId]);

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: isDark ? COLORS.darkBg : COLORS.lightBg }]}>
                <ActivityIndicator color={COLORS.brandBlue} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? COLORS.darkBg : COLORS.lightBg }]} edges={['top']}>
            <ProfileView
                name={vehicle?.driverName || 'Driver'}
                email={vehicle?.driverEmail || 'driver@voltlink.com'}
                role="driver"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});

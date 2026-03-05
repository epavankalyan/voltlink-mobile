import React, { useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileView } from '../../components/profile/ProfileView';
import { COLORS } from '../../utils/theme';
import { useThemeStore } from '../../store/themeStore';
import { getVehicleDashboard, getDriverProfile, getVehiclesByDriver } from '../../services/driver.service';
import { Vehicle } from '../../types/vehicle.types';

import { useVehicleStore } from '../../store/vehicleStore';

export default function DriverProfile() {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { currentVehicleId } = useVehicleStore();

    useEffect(() => {
        getDriverProfile().then(setProfile).catch(console.error);

        getVehiclesByDriver().then((vehicles: any[]) => {
            const vehicleId = vehicles?.[0]?.id || currentVehicleId;
            if (vehicleId) {
                getVehicleDashboard(vehicleId).then(setVehicle).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        }).catch((err: any) => {
            console.error(err);
            setLoading(false);
        });
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
                name={profile?.name || vehicle?.driverName || 'Driver'}
                email={profile?.email || vehicle?.driverEmail || 'driver@voltlink.com'}
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

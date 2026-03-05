import React, { useEffect, useState } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileView } from '../../components/profile/ProfileView';
import { COLORS } from '../../utils/theme';
import { useThemeStore } from '../../store/themeStore';
import { getB2CStats } from '../../services/b2c.service';

export default function B2CProfile() {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getB2CStats()
            .then(setStats)
            .finally(() => setLoading(false));
    }, []);

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
                name={stats?.user?.name || 'User'}
                email={stats?.user?.email || 'user@voltlink.com'}
                role="b2c"
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

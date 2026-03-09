import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, FlatList, Text, TouchableOpacity, Pressable, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Clock, MapPin, Star } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useThemeStore } from '../../store/themeStore';
import { useVehicleStore } from '../../store/vehicleStore';
import { getDriverSessions } from '../../services/driver.service';
import { getBookings, cancelBooking } from '../../services/booking.service';
import { format } from 'date-fns';

type SessionItem = {
    id: string;
    stationName: string;
    date: string;
    duration: string;
    kwh: number;
    cost: number;
    rating: number;
    carbonSaved: number;
    connectorType: string;
    status?: string;
};

type FilterKey = 'all' | 'completed' | 'active';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'active', label: 'Active' },
];

export default function DriverHistory() {
    const router = useRouter();
    const { theme } = useThemeStore();
    const { currentVehicleId } = useVehicleStore();
    const isDark = theme === 'dark';
    const [filter, setFilter] = useState<FilterKey>('all');
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);

    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const status = filter === 'all' ? undefined : filter;

            const [data, bookingsResponse] = await Promise.all([
                getDriverSessions(undefined, currentVehicleId || '', status as any),
                (filter === 'all' || filter === 'active') ? getBookings({ status: 'pending' }) : Promise.resolve({ data: [] })
            ]);

            const bookings = bookingsResponse.data || [];

            const sessionMapped: SessionItem[] = (data || []).map((s: any) => {
                const startTime = s.start_time ? new Date(s.start_time) : new Date();
                const endTime = s.end_time ? new Date(s.end_time) : null;
                const durationMs = endTime ? endTime.getTime() - startTime.getTime() : 0;
                const mins = Math.round(durationMs / 60000);
                const hrs = Math.floor(mins / 60);
                const duration = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;

                return {
                    id: s.id,
                    stationName: s.station_name || 'Charging Station',
                    date: startTime.toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                    }),
                    duration,
                    kwh: s.kwh || 0,
                    cost: s.total_cost || 0,
                    rating: 0,
                    carbonSaved: s.carbon_saved_kg || 0,
                    connectorType: s.connector?.connector_type || 'CCS2',
                    status: s.status || 'completed'
                };
            });

            const bookingMapped: SessionItem[] = bookings.map((b: any) => ({
                id: b.id,
                stationName: b.connector?.station_name || 'Booked Station',
                date: format(new Date(b.booking_time), 'dd MMM yyyy, hh:mm a'),
                duration: 'Not Started',
                kwh: 0,
                cost: 0,
                rating: 0,
                carbonSaved: 0,
                connectorType: b.connector?.connector_type || 'Reserved',
                status: 'pending'
            }));

            setSessions([...bookingMapped, ...sessionMapped]);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [filter]);

    const handleCancelBooking = (id: string) => {
        Alert.alert(
            'Cancel Booking?',
            'Cancelling within 15 minutes of the slot incurs a ₹20 penalty. Do you want to proceed?',
            [
                { text: 'Keep Booking', style: 'cancel' },
                {
                    text: 'Cancel (₹20 Penalty)',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await cancelBooking(id, { reason: 'User requested' });
                            Alert.alert('Cancelled', 'Your booking has been cancelled and a ₹20 penalty has been applied.');
                            fetchSessions();
                        } catch (error) {
                            console.error('Cancel booking error:', error);
                            Alert.alert('Error', 'Failed to cancel the booking.');
                            setLoading(false);
                        }
                    }
                },
            ]
        );
    };

    const totalKwh = sessions.reduce((s, i) => s + (i.kwh || 0), 0);
    const totalCost = sessions.reduce((s, i) => s + (i.cost || 0), 0);
    const totalCarbon = sessions.reduce((s, i) => s + (i.carbonSaved || 0), 0);

    const renderSession = ({ item }: { item: SessionItem }) => (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push({
                pathname: '/(driver)/session',
                params: { sessionId: item.id }
            })}
        >
            <GlassCard style={styles.sessionCard as any} intensity={20}>
                <View style={styles.sessionHeader}>
                    <View style={styles.sessionInfo}>
                        <Text style={[styles.sessionStation, { color: textPrimary }]}>{item.stationName}</Text>
                        <View style={styles.sessionMeta}>
                            <MapPin size={12} color={textSecondary} />
                            <Text style={[styles.sessionMetaText, { color: textSecondary }]}>{item.connectorType}</Text>
                            <Clock size={12} color={textSecondary} />
                            <Text style={[styles.sessionMetaText, { color: textSecondary }]}>{item.duration}</Text>
                        </View>
                    </View>
                    {item.status === 'pending' ? (
                        <TouchableOpacity onPress={() => handleCancelBooking(item.id)}>
                            <Text style={{ color: COLORS.alertRed, ...TYPOGRAPHY.label }}>Cancel</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={[styles.sessionDate, { color: textSecondary }]}>{item.date}</Text>
                    )}
                </View>

                <View style={styles.sessionStats}>
                    <View style={styles.sessionStat}>
                        <Zap size={14} color={COLORS.brandBlue} />
                        <Text style={[styles.sessionStatValue, { color: textPrimary }]}>{item.kwh} kWh</Text>
                    </View>
                    <View style={styles.sessionStat}>
                        <Text style={[styles.sessionStatValue, { color: COLORS.successGreen }]}>₹{item.cost.toFixed(0)}</Text>
                    </View>
                    {item.carbonSaved > 0 && (
                        <View style={styles.sessionStat}>
                            <Text style={[styles.sessionStatValue, { color: textSecondary }]}>🌱 {item.carbonSaved.toFixed(1)} kg</Text>
                        </View>
                    )}
                </View>

                {item.rating > 0 && (
                    <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map(n => (
                            <Star
                                key={n}
                                size={14}
                                color={n <= item.rating ? COLORS.warningOrange : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
                                fill={n <= item.rating ? COLORS.warningOrange : 'transparent'}
                            />
                        ))}
                    </View>
                )}
            </GlassCard>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
            <SectionHeader title="Charging History" />

            {/* Summary Card */}
            <GlassCard style={styles.summaryCard as any} intensity={25}>
                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: textPrimary }]}>{sessions.length}</Text>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Sessions</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: textPrimary }]}>{totalKwh.toFixed(1)}</Text>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Total kWh</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: COLORS.successGreen }]}>₹{totalCost.toFixed(0)}</Text>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>Total Spent</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: textPrimary }]}>🌱 {totalCarbon.toFixed(1)}</Text>
                        <Text style={[styles.summaryLabel, { color: textSecondary }]}>kg CO₂</Text>
                    </View>
                </View>
            </GlassCard>

            {/* Filters */}
            <View style={styles.filterRow}>
                {FILTERS.map(f => (
                    <Pressable
                        key={f.key}
                        style={[
                            styles.filterChip,
                            filter === f.key && { backgroundColor: COLORS.brandBlue },
                            filter !== f.key && { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' },
                        ]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Text style={[
                            styles.filterText,
                            { color: filter === f.key ? '#000' : textSecondary }
                        ]}>{f.label}</Text>
                    </Pressable>
                ))}
            </View>

            {/* Session List */}
            {loading ? (
                <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color={COLORS.brandBlue} />
                </View>
            ) : (
                <FlatList
                    data={sessions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSession}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: textSecondary }]}>No sessions found</Text>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    summaryCard: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
    summaryItem: { alignItems: 'center' },
    summaryValue: { ...TYPOGRAPHY.sectionHeader, fontSize: 16, fontWeight: '700' },
    summaryLabel: { ...TYPOGRAPHY.label, marginTop: 2 },
    filterRow: {
        flexDirection: 'row',
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        gap: SPACING.sm,
    },
    filterChip: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.md,
    },
    filterText: { ...TYPOGRAPHY.label, fontWeight: '600' },
    listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 120 },
    sessionCard: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.sm,
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    sessionInfo: { flex: 1, marginRight: SPACING.sm },
    sessionStation: { ...TYPOGRAPHY.body, fontWeight: '700' },
    sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    sessionMetaText: { ...TYPOGRAPHY.label },
    sessionDate: { ...TYPOGRAPHY.label },
    sessionStats: {
        flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap',
    },
    sessionStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sessionStatValue: { ...TYPOGRAPHY.body, fontWeight: '600' },
    ratingRow: {
        flexDirection: 'row', gap: 2, marginTop: SPACING.sm,
    },
    centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { ...TYPOGRAPHY.body, textAlign: 'center', marginTop: SPACING.xl },
});

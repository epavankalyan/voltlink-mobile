import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, FlatList, Text, TouchableOpacity, Pressable, ActivityIndicator, Alert, Platform, Linking, Modal
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Clock, MapPin, ThumbsUp, ThumbsDown, CheckCircle, XCircle, Info, Calendar } from 'lucide-react-native';
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
    const [verifyingStation, setVerifyingStation] = useState<string | null>(null);
    const [showWorkingModal, setShowWorkingModal] = useState(false);

    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;

    const fetchSessions = async (forceRefresh: boolean = false) => {
        setLoading(true);
        try {
            const status = filter === 'all' ? undefined : filter;

            const [data, bookingsResponse] = await Promise.all([
                getDriverSessions(undefined, currentVehicleId || '', status as any, forceRefresh),
                (filter === 'all' || filter === 'active') ? getBookings({ status: 'pending' }, forceRefresh) : Promise.resolve({ data: [] })
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

    useFocusEffect(
        React.useCallback(() => {
            fetchSessions(true);
        }, [filter])
    );

    const openDirections = () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=12.9716,77.5946`;
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    const handleOpenSession = (sessionId: string) => {
        setVerifyingStation(sessionId);
        setShowWorkingModal(true);
    };

    const confirmStationWorking = (isWorking: boolean) => {
        setShowWorkingModal(false);
        if (isWorking) {
            router.push({
                pathname: '/driver/session',
                params: { sessionId: verifyingStation! }
            });
        } else {
            Alert.alert(
                "Station Issue",
                "We're sorry the station is not working. Redirecting you to Home to find another recommendation.",
                [{ text: "OK", onPress: () => router.replace('/driver/dashboard') }]
            );
        }
    };

    const handleCancelBooking = (id: string) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Cancelling within 15 minutes of the slot incurs a ₹20 penalty. Do you want to proceed?');
            if (confirmed) {
                (async () => {
                    try {
                        setLoading(true);
                        await cancelBooking(id, { reason: 'Cancelled by user' });
                        window.alert('Your booking has been cancelled and a ₹20 penalty has been applied.');
                        fetchSessions(true);
                    } catch (error) {
                        console.error('Cancel booking error:', error);
                        window.alert('Failed to cancel the booking.');
                        setLoading(false);
                    }
                })();
            }
            return;
        }

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
                            await cancelBooking(id, { reason: 'Cancelled by user' });
                            Alert.alert('Cancelled', 'Your booking has been cancelled and a ₹20 penalty has been applied.');
                            fetchSessions(true);
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
        <View style={{ marginBottom: SPACING.sm }}>
            <GlassCard style={{ ...(styles.sessionCard as any), padding: 0 }} intensity={20}>

                {/* Cancel Button Absolute */}
                {item.status === 'pending' && (
                    <TouchableOpacity
                        onPress={() => handleCancelBooking(item.id)}
                        style={{ position: 'absolute', right: SPACING.lg, top: SPACING.md, zIndex: 10, padding: 4 }}
                    >
                        <XCircle size={20} color={COLORS.alertRed} />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => router.push({
                        pathname: '/driver/session',
                        params: { sessionId: item.id }
                    })}
                    style={{ padding: SPACING.md }}
                >
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
                            <View style={{ width: 45 }} />
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
                            {item.rating >= 4 ? (
                                <ThumbsUp size={14} color={COLORS.successGreen} fill={COLORS.successGreen} />
                            ) : (
                                <ThumbsDown size={14} color={COLORS.alertRed} fill={COLORS.alertRed} />
                            )}
                            <Text style={[styles.sessionMetaText, { color: item.rating >= 4 ? COLORS.successGreen : COLORS.alertRed, marginLeft: 4 }]}>
                                {item.rating >= 4 ? 'Good' : 'Bad'}
                            </Text>
                        </View>
                    )}

                    {item.status === 'pending' && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { borderColor: COLORS.brandBlue }]}
                                onPress={openDirections}
                            >
                                <MapPin size={14} color={COLORS.brandBlue} />
                                <Text style={[styles.actionBtnText, { color: COLORS.brandBlue }]}>View Directions</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: COLORS.brandBlue, borderColor: COLORS.brandBlue }]}
                                onPress={() => handleOpenSession(item.id)}
                            >
                                <Zap size={14} color="#000" />
                                <Text style={[styles.actionBtnText, { color: '#000' }]}>Open Session</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </TouchableOpacity>
            </GlassCard>
        </View>
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

            {/* Station Working Confirmation Modal */}
            <Modal
                transparent
                visible={showWorkingModal}
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalContent as any} intensity={30}>
                        <View style={styles.modalIcon}>
                            <Info size={32} color={COLORS.brandBlue} />
                        </View>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>Start Charging?</Text>
                        <Text style={[styles.modalSub, { color: textSecondary }]}>
                            Is the charging station working?
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: COLORS.successGreen + '20', borderColor: COLORS.successGreen }]}
                                onPress={() => confirmStationWorking(true)}
                            >
                                <CheckCircle size={18} color={COLORS.successGreen} />
                                <Text style={[styles.modalBtnText, { color: COLORS.successGreen }]}>Yes, Station is Working</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: COLORS.alertRed + '20', borderColor: COLORS.alertRed }]}
                                onPress={() => confirmStationWorking(false)}
                            >
                                <XCircle size={18} color={COLORS.alertRed} />
                                <Text style={[styles.modalBtnText, { color: COLORS.alertRed }]}>No, Station is Not Working</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.modalCancel}
                            onPress={() => setShowWorkingModal(false)}
                        >
                            <Text style={[styles.modalCancelText, { color: textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </View>
            </Modal>
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
    actionRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
    actionBtnText: { ...TYPOGRAPHY.label, fontWeight: '700', fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
    modalContent: { width: '100%', padding: SPACING.xl, borderRadius: BORDER_RADIUS.xl, alignItems: 'center' },
    modalIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.brandBlue + '15', justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
    modalTitle: { ...TYPOGRAPHY.sectionHeader, fontSize: 22, marginBottom: 8 },
    modalSub: { ...TYPOGRAPHY.body, textAlign: 'center', marginBottom: SPACING.xl, opacity: 0.8 },
    modalButtons: { width: '100%', gap: SPACING.md },
    modalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, borderWidth: 1 },
    modalBtnText: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 15 },
    modalCancel: { marginTop: SPACING.lg },
    modalCancelText: { ...TYPOGRAPHY.label, fontWeight: '600' },
});

import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, FlatList, Text, TouchableOpacity, Pressable, ActivityIndicator, Alert, Platform, Linking, Modal, TextInput
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Clock, MapPin, ThumbsUp, ThumbsDown, CheckCircle, XCircle, Info, Calendar, Play, AlertTriangle } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useThemeStore } from '../../store/themeStore';
import { useVehicleStore } from '../../store/vehicleStore';
import { apiClient } from '../../services/api.service';
import { getDriverSessions } from '../../services/driver.service';
import { getUserSessions } from '../../services/b2c.service';
import { cancelBooking, deleteBooking, getPendingBookings } from '../../services/booking.service';
import { stopSession, getSessionsByVehicle } from '../../services/session.service';
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
    connectorId?: string;
    vehicleId?: string;
    status?: string;
    currentSoc?: number;
    isLive?: boolean;
    estimatedCompletion?: string;
    source: 'booking' | 'session';
    bookingTime?: string;
};

type FilterKey = 'all' | 'completed' | 'active';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'active', label: 'Active' },
];

const DEFAULT_DRIVER_ID = process.env.EXPO_PUBLIC_DEFAULT_DRIVER_ID ?? '4';

export default function DriverHistory() {
    const router = useRouter();
    const { theme } = useThemeStore();
    const { currentVehicleId, myVehicle } = useVehicleStore();
    const isDark = theme === 'dark';
    const params = useLocalSearchParams<{ refresh?: string, filter?: FilterKey }>();
    const [filter, setFilter] = useState<FilterKey>((params.filter as FilterKey) || 'active');
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [allSessions, setAllSessions] = useState<SessionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelTarget, setCancelTarget] = useState<SessionItem | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);

    // Update filter if params change
    useEffect(() => {
        if (params.filter) {
            setFilter(params.filter as FilterKey);
        }
    }, [params.filter, params.refresh]);

    // Polling for active sessions
    useEffect(() => {
        let interval: any;
        if (filter === 'active') {
            interval = setInterval(() => {
                fetchSessions(true);
            }, 10000); // Poll every 10 seconds for active bookings/sessions
        }
        return () => clearInterval(interval);
    }, [filter, currentVehicleId]);

    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    const mapSessions = (data: any[], source: 'session' | 'booking' = 'session'): SessionItem[] =>
        (data || []).map((s: any) => {
            let duration = 'N/A';
            if (s.elapsed_seconds !== undefined && s.elapsed_seconds !== null) {
                duration = `${s.elapsed_seconds}`;
            } else if (s.start_time && s.end_time) {
                const mins = Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000);
                const hrs = Math.floor(mins / 60);
                duration = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
            }
            let date = 'Past session';
            if (s.start_time) {
                try {
                    date = new Date(s.start_time).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                    });
                } catch { }
            } else if (s.booking_time) {
                try {
                    date = format(new Date(s.booking_time), 'dd MMM yyyy');
                } catch { }
            }
            return {
                id: String(s.id),
                stationName: s.station_name || 'Charging Station',
                date,
                duration,
                kwh: s.kwh || 0,
                cost: s.total_cost || 0,
                rating: 0,
                carbonSaved: s.carbon_saved_kg || 0,
                connectorType: s.connector?.connector_type || s.connector_id || '',
                connectorId: s.connector_id ? String(s.connector_id) : undefined,
                vehicleId: s.vehicle_id ? String(s.vehicle_id) : undefined,
                status: s.status || (source === 'booking' ? 'pending' : 'completed'),
                currentSoc: s.current_soc,
                isLive: s.is_live,
                estimatedCompletion: s.estimated_completion,
                source,
                bookingTime: s.booking_time,
            };
        });

    const fetchSessions = async (forceRefresh: boolean = false) => {
        setLoading(true);
        // Clear sessions to ensure no stale data or duplicates are shown while loading
        setSessions([]);
        try {
            if (filter === 'active') {
                // Fetch only pending bookings and active sessions
                const [pendingBookings, activeSessions] = await Promise.all([
                    getPendingBookings(DEFAULT_DRIVER_ID, forceRefresh).catch(err => {
                        console.error('[Driver] Failed to fetch pending bookings:', err?.response?.data || err?.message);
                        return [];
                    }),
                    currentVehicleId
                        ? getSessionsByVehicle(currentVehicleId, 'active').catch(err => {
                            console.error('[Driver] Failed to fetch active sessions:', err?.response?.data || err?.message);
                            return [];
                        })
                        : Promise.resolve([]),
                ]);

                const bookingItems = mapSessions(pendingBookings, 'booking');
                const activeItems = mapSessions(activeSessions, 'session');
                const merged = [...bookingItems, ...activeItems];
                merged.sort((a, b) => {
                    const tA = a.bookingTime ? new Date(a.bookingTime).getTime() : 0;
                    const tB = b.bookingTime ? new Date(b.bookingTime).getTime() : 0;
                    return tB - tA;
                });
                setSessions(merged);
            } else if (filter === 'completed') {
                // Fetch only completed sessions from backend (user-centric for reliability)
                const completedSessions = await getUserSessions(DEFAULT_DRIVER_ID, 'completed', forceRefresh).catch(err => {
                    console.error('[Driver] Failed to fetch completed sessions:', err?.response?.data || err?.message);
                    return [];
                });
                setSessions(mapSessions(completedSessions));
            } else {
                // "All" Tab: Fetch everything, prioritize active/pending
                const [pendingBookings, activeSessions, allSessionsData] = await Promise.all([
                    getPendingBookings(DEFAULT_DRIVER_ID, forceRefresh).catch(() => []),
                    currentVehicleId ? getSessionsByVehicle(currentVehicleId, 'active').catch(() => []) : Promise.resolve([]),
                    getUserSessions(DEFAULT_DRIVER_ID, undefined, forceRefresh).catch(() => []),
                ]);

                const bookingItems = mapSessions(pendingBookings, 'booking');
                const activeItems = mapSessions(activeSessions, 'session');
                const allItems = mapSessions(allSessionsData);

                const activeIds = new Set([...bookingItems, ...activeItems].map(i => i.id));
                const sortedActive = [...bookingItems, ...activeItems].sort((a, b) => {
                    const tA = a.bookingTime ? new Date(a.bookingTime).getTime() : 0;
                    const tB = b.bookingTime ? new Date(b.bookingTime).getTime() : 0;
                    return tB - tA;
                });

                // Filter out any sessions that are already showing as active/pending to avoid duplicates
                const completedItems = allItems.filter(i => i.status === 'completed' && !activeIds.has(i.id));

                // Active and pending sessions MUST appear first, followed by completed sessions
                setSessions([...sortedActive, ...completedItems]);
                setAllSessions(allItems);
            }
        } catch (error: any) {
            console.error('[Driver] Error loading history:', error?.response?.data || error?.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [filter]);

    useFocusEffect(
        React.useCallback(() => {
            // Always fetch fresh data from API when navigating to this screen
            fetchSessions(true);
        }, [filter])
    );

    const openDirections = () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=12.9716,77.5946`;
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    const handleCancelPress = (item: SessionItem) => {
        setCancelTarget(item);
        setCancelReason(''); // Reset reason
    };

    const submitCancel = async () => {
        if (!cancelTarget) return;

        if (!cancelReason.trim()) {
            Alert.alert('Reason Required', 'Please provide a reason for cancellation.');
            return;
        }

        setCancelling(true);
        let apiFailed = false;
        try {
            if (cancelTarget.source === 'session') {
                await stopSession(String(cancelTarget.id));
            } else {
                await cancelBooking(String(cancelTarget.id), { reason: cancelReason });
            }
        } catch (error: any) {
            apiFailed = true;
            const label = cancelTarget.source === 'session' ? 'stopSession' : 'deleteBooking';
            const endpoint = cancelTarget.source === 'session'
                ? `PATCH /sessions/${cancelTarget.id}/stop`
                : `DELETE /bookings/${cancelTarget.id}`;
            console.error(`[Driver] ${label} API failed. Removing from active list locally.`, {
                endpoint,
                error: error?.response?.data || error?.message,
            });
        } finally {
            setCancelling(false);
        }
        setCancelTarget(null);
        if (apiFailed) {
            setSessions(prev => prev.filter(i => i.id !== cancelTarget.id));
        } else {
            fetchSessions(true);
        }
    };

    const totalKwh = allSessions.reduce((s, i) => s + (i.kwh || 0), 0);
    const totalCost = allSessions.reduce((s, i) => s + (i.cost || 0), 0);
    const totalCarbon = allSessions.reduce((s, i) => s + (i.carbonSaved || 0), 0);

    const renderSession = ({ item }: { item: SessionItem }) => (
        <View style={{ marginBottom: SPACING.sm }}>
            <GlassCard style={{ ...(styles.sessionCard as any), padding: 0 }} intensity={20}>

                {(item.status === 'active' || item.status === 'pending') && (
                    <TouchableOpacity
                        onPress={() => handleCancelPress(item)}
                        style={{ position: 'absolute', right: SPACING.lg, top: SPACING.md, zIndex: 10, padding: 4 }}
                    >
                        <XCircle size={20} color={COLORS.alertRed} />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                        if (item.status === 'active' || item.status === 'pending') {
                            const bl = myVehicle?.batteryLevel != null ? String(myVehicle.batteryLevel) : undefined;
                            const params = item.source === 'session'
                                ? { sessionId: item.id, ...(bl != null ? { batteryLevel: bl } : {}) }
                                : {
                                    bookingId: item.id,
                                    ...(item.connectorId ? { connectorId: item.connectorId } : {}),
                                    ...(item.vehicleId ? { vehicleId: item.vehicleId } : {}),
                                    ...(bl != null ? { batteryLevel: bl } : {}),
                                };
                            router.push({ pathname: '/driver/session', params });
                        }
                    }}
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
                        {(item.status === 'active' || item.status === 'pending') ? (
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
                        {item.currentSoc !== undefined && (
                            <View style={styles.sessionStat}>
                                <Text style={[styles.sessionStatValue, { color: COLORS.brandBlue }]}>🔋 {item.currentSoc}%</Text>
                            </View>
                        )}
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

                    {(item.status === 'active' || item.status === 'pending') && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { borderColor: COLORS.brandBlue }]}
                                onPress={openDirections}
                            >
                                <MapPin size={14} color={COLORS.brandBlue} />
                                <Text style={[styles.actionBtnText, { color: COLORS.brandBlue }]}>View Directions</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { borderColor: COLORS.successGreen }]}
                                onPress={() => {
                                    const bl = myVehicle?.batteryLevel != null ? String(myVehicle.batteryLevel) : undefined;
                                    const params = item.source === 'session'
                                        ? { sessionId: item.id, ...(bl != null ? { batteryLevel: bl } : {}) }
                                        : {
                                            bookingId: item.id,
                                            ...(item.connectorId ? { connectorId: item.connectorId } : {}),
                                            ...(item.vehicleId ? { vehicleId: item.vehicleId } : {}),
                                            ...(bl != null ? { batteryLevel: bl } : {}),
                                        };
                                    router.push({ pathname: '/driver/session', params });
                                }}
                            >
                                <Play size={14} color={COLORS.successGreen} />
                                <Text style={[styles.actionBtnText, { color: COLORS.successGreen }]}>Open Session</Text>
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

            <GlassCard style={styles.summaryCard as any} intensity={25}>
                <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: textPrimary }]}>{allSessions.length}</Text>
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

            {loading ? (
                <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color={COLORS.brandBlue} />
                </View>
            ) : (
                <FlatList
                    data={sessions}
                    keyExtractor={(item, index) => `${item.source}-${item.id}-${index}`}
                    renderItem={renderSession}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onRefresh={() => fetchSessions(true)}
                    refreshing={loading}
                    ListEmptyComponent={
                        <Text style={[styles.emptyText, { color: textSecondary }]}>No sessions found</Text>
                    }
                />
            )}

            <Modal
                visible={cancelTarget !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setCancelTarget(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1a1a2e' : '#fff' }]}>
                        <View style={[styles.modalIcon, { backgroundColor: COLORS.alertRed + '15' }]}>
                            <XCircle size={32} color={COLORS.alertRed} />
                        </View>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>
                            {cancelTarget?.source === 'session' ? 'Stop Session' : 'Cancel Booking'}
                        </Text>
                        <Text style={[styles.modalSub, { color: textSecondary, marginBottom: SPACING.md }]}>
                            {cancelTarget?.source === 'session'
                                ? 'Are you sure you want to stop this charging session?'
                                : 'Please provide a reason for cancelling this booking.'}
                        </Text>

                        {cancelTarget?.source === 'booking' && (
                            <TextInput
                                style={{
                                    width: '100%',
                                    height: 80,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                    borderRadius: BORDER_RADIUS.md,
                                    padding: SPACING.md,
                                    color: textPrimary,
                                    textAlignVertical: 'top',
                                    marginBottom: SPACING.lg,
                                    borderWidth: 1,
                                    borderColor: borderColor,
                                }}
                                placeholder="Reason for cancellation..."
                                placeholderTextColor={COLORS.textMutedDark}
                                multiline
                                value={cancelReason}
                                onChangeText={setCancelReason}
                            />
                        )}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, {
                                    backgroundColor: COLORS.alertRed,
                                    borderColor: COLORS.alertRed,
                                }]}
                                onPress={submitCancel}
                                disabled={cancelling}
                            >
                                {cancelling ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                                        {cancelTarget?.source === 'session' ? 'Yes, Stop' : 'Confirm Cancellation'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setCancelTarget(null)}
                                disabled={cancelling}
                            >
                                <Text style={[styles.modalCancelText, { color: textSecondary }]}>Go Back</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
    modalIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
    modalTitle: { ...TYPOGRAPHY.sectionHeader, fontSize: 22, marginBottom: 8 },
    modalSub: { ...TYPOGRAPHY.body, textAlign: 'center', marginBottom: SPACING.lg, opacity: 0.8 },
    modalButtons: { width: '100%', gap: SPACING.md, alignItems: 'center' },
    modalBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, borderWidth: 1 },
    modalBtnText: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 15 },
    modalCancel: { marginTop: SPACING.sm },
    modalCancelText: { ...TYPOGRAPHY.label, fontWeight: '600' },
});

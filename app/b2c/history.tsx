import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Text, TouchableOpacity, Alert, Pressable, ActivityIndicator, Platform, Linking, Modal, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Clock, ThumbsUp, ThumbsDown, MapPin, CheckCircle, Info, XCircle, Play, AlertTriangle } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { useThemeStore } from '../../store/themeStore';
import { useVehicleStore } from '../../store/vehicleStore';
import { getUserSessions } from '../../services/b2c.service';
import { deleteBooking, getPendingBookings } from '../../services/booking.service';
import { stopSession, getSessionsByVehicle } from '../../services/session.service';
import { format } from 'date-fns';

const TABS = ['Active', 'Past'];

type HistoryItem = {
    id: string;
    type?: string;
    time?: string;
    date?: string;
    station: string;
    cpo?: string;
    estCost?: number;
    kWh?: number;
    cost?: number;
    duration?: string;
    rating?: number;
    status?: string;
    connectorId?: string;
    vehicleId?: string;
    currentSoc?: number;
    isLive?: boolean;
    estimatedCompletion?: string;
    source: 'booking' | 'session';
    bookingTime?: string;
};

export default function HistoryScreen() {
    const router = useRouter();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState('Active');
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [cancelTarget, setCancelTarget] = useState<HistoryItem | null>(null);
    const [cancelling, setCancelling] = useState(false);

    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    const fetchData = async (forceRefresh: boolean = false) => {
        setLoading(true);
        try {
            if (activeTab === 'Active') {
                const [pendingBookings, activeSessions] = await Promise.all([
                    getPendingBookings(undefined, forceRefresh).catch(err => {
                        console.error('[B2C] Failed to fetch pending bookings:', err?.response?.data || err?.message);
                        return [];
                    }),
                    currentVehicleId
                        ? getSessionsByVehicle(currentVehicleId, 'active').catch(err => {
                            console.error('[B2C] Failed to fetch active sessions:', err?.response?.data || err?.message);
                            return [];
                        })
                        : getUserSessions(undefined, 'active', forceRefresh).catch(err => {
                            console.error('[B2C] Failed to fetch active sessions:', err?.response?.data || err?.message);
                            return [];
                        }),
                ]);

                const bookingItems: HistoryItem[] = (pendingBookings || []).map((b: any) => {
                    let timeLabel = 'Pending';
                    if (b.booking_time) {
                        try {
                            timeLabel = format(new Date(b.booking_time), 'hh:mm a');
                        } catch {}
                    }
                    return {
                        id: String(b.id),
                        status: 'pending',
                        time: timeLabel,
                        station: b.station_name || b.connector_id || 'Charging Station',
                        type: 'Booking',
                        cost: b.total_cost,
                        kWh: b.kwh,
                        connectorId: b.connector_id ? String(b.connector_id) : undefined,
                        vehicleId: b.vehicle_id ? String(b.vehicle_id) : undefined,
                        currentSoc: b.current_soc,
                        source: 'booking' as const,
                        bookingTime: b.booking_time,
                    };
                });

                const sessionItems: HistoryItem[] = (activeSessions || []).map((s: any) => ({
                    id: String(s.id),
                    status: 'active',
                    time: 'Charging Now',
                    station: s.station_name || 'Charging Station',
                    type: s.session_type || 'Charging',
                    cost: s.total_cost,
                    kWh: s.kwh,
                    connectorId: s.connector_id,
                    currentSoc: s.current_soc,
                    source: 'session' as const,
                }));

                const merged = [...bookingItems, ...sessionItems];
                merged.sort((a, b) => {
                    const tA = a.bookingTime ? new Date(a.bookingTime).getTime() : 0;
                    const tB = b.bookingTime ? new Date(b.bookingTime).getTime() : 0;
                    return tB - tA;
                });
                setItems(merged);
            } else {
                const sessions = await getUserSessions(undefined, 'completed', forceRefresh).catch(err => {
                    console.error('[B2C] Failed to fetch completed sessions:', err?.response?.data || err?.message);
                    return [];
                });
                const mappedItems: HistoryItem[] = sessions.map((s: any) => {
                    let duration = 'N/A';
                    if (s.elapsed_seconds) {
                        const totalMins = Math.round(s.elapsed_seconds / 60);
                        const hrs = Math.floor(totalMins / 60);
                        const mins = totalMins % 60;
                        duration = hrs > 0 ? `${hrs}h ${mins}m` : `${totalMins}m`;
                    } else if (s.start_time && s.end_time) {
                        const mins = Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000);
                        duration = `${mins} min`;
                    }

                    let date = 'Past session';
                    if (s.start_time) {
                        try { date = format(new Date(s.start_time), 'dd MMM yyyy'); } catch { }
                    }

                    return {
                        id: s.id,
                        date,
                        station: s.station_name || 'Charging Station',
                        kWh: s.kwh,
                        cost: s.total_cost,
                        duration,
                        connectorId: s.connector_id || s.connector?.connector_type,
                        currentSoc: s.current_soc,
                        isLive: s.is_live,
                        estimatedCompletion: s.estimated_completion,
                        status: s.status,
                        rating: undefined,
                        source: 'session' as const,
                    };
                });
                setItems(mappedItems);
            }
        } catch (error: any) {
            console.error('[B2C] Error fetching history:', error?.response?.data || error?.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    useFocusEffect(
        React.useCallback(() => {
            fetchData(true);
        }, [activeTab])
    );

    const openDirections = () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=12.9716,77.5946`;
        Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    };

    const handleCancel = (item: HistoryItem) => {
        if (item.source === 'session') {
            setCancelTarget(item);
        } else {
            setCancelTarget(item);
        }
    };

    const submitCancel = async () => {
        if (!cancelTarget) return;
        setCancelling(true);
        let apiFailed = false;
        try {
            if (cancelTarget.source === 'session') {
                await stopSession(String(cancelTarget.id));
            } else {
                await deleteBooking(String(cancelTarget.id));
            }
        } catch (error: any) {
            apiFailed = true;
            const label = cancelTarget.source === 'session' ? 'stopSession' : 'deleteBooking';
            const endpoint = cancelTarget.source === 'session'
                ? `PATCH /sessions/${cancelTarget.id}/stop`
                : `DELETE /bookings/${cancelTarget.id}`;
            console.error(`[B2C] ${label} API failed. Removing from active list locally.`, {
                endpoint,
                error: error?.response?.data || error?.message,
            });
        } finally {
            setCancelling(false);
        }
        setCancelTarget(null);
        if (apiFailed) {
            setItems(prev => prev.filter(i => i.id !== cancelTarget.id));
        } else {
            fetchData(true);
        }
    };

    const { myVehicle, currentVehicleId } = useVehicleStore();

    const getSessionParams = (item: HistoryItem) => {
        const bl = myVehicle?.batteryLevel != null ? String(myVehicle.batteryLevel) : undefined;
        if (item.source === 'session') {
            return { sessionId: item.id, ...(bl != null ? { batteryLevel: bl } : {}) };
        }
        return {
            bookingId: item.id,
            ...(item.connectorId ? { connectorId: item.connectorId } : {}),
            ...(item.vehicleId ? { vehicleId: item.vehicleId } : {}),
            ...(bl != null ? { batteryLevel: bl } : {}),
        };
    };

    const renderItem = ({ item }: { item: HistoryItem }) => {
        if (activeTab === 'Active') {
            return (
                <View style={{ marginBottom: SPACING.md }}>
                    <GlassCard style={{ ...(styles.bookingCard as any), padding: 0 }} intensity={25}>
                        <View style={{ padding: SPACING.lg }}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconBox, { backgroundColor: item.status === 'pending' ? COLORS.brandBlue + '20' : COLORS.successGreen + '20' }]}>
                                    <Zap size={18} color={item.status === 'pending' ? COLORS.brandBlue : COLORS.successGreen} />
                                </View>
                                <View style={styles.headerInfo}>
                                    <Text style={[styles.bookingTime, { color: textPrimary }]}>{item.time}</Text>
                                    <Text style={[styles.bookingStation, { color: textSecondary }]}>{item.station}</Text>
                                </View>
                                <TouchableOpacity
                                    style={{ padding: 6 }}
                                    onPress={() => handleCancel(item)}
                                >
                                    <XCircle size={20} color={COLORS.alertRed} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.bookingDetails}>
                                <View style={styles.detailRow}>
                                    <Zap size={14} color={COLORS.successGreen} />
                                    <Text style={[styles.detailText, { color: textSecondary }]}>
                                        {item.type}{item.cost ? ` · ₹${item.cost}` : ''}{item.kWh ? ` · ${item.kWh} kWh` : ''}{item.currentSoc ? ` · 🔋${item.currentSoc}%` : ''}
                                    </Text>
                                </View>
                            </View>

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
                                    onPress={() => router.push({
                                        pathname: '/b2c/session',
                                        params: getSessionParams(item),
                                    })}
                                >
                                    <Play size={14} color={COLORS.successGreen} />
                                    <Text style={[styles.actionBtnText, { color: COLORS.successGreen }]}>Open Session</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </GlassCard>
                </View>
            );
        }

        const isExpanded = expandedSession === item.id;
        return (
            <GlassCard style={styles.sessionCard as any} intensity={15}>
                <Pressable onPress={() => setExpandedSession(isExpanded ? null : item.id)}>
                    <View style={styles.sessionMain}>
                        <View style={[styles.iconBox, { backgroundColor: COLORS.successGreen + '15' }]}>
                            <Zap size={18} color={COLORS.successGreen} />
                        </View>
                        <View style={styles.sessionInfo}>
                            <Text style={[styles.sessionStation, { color: textPrimary }]} numberOfLines={1}>{item.station}</Text>
                            <Text style={[styles.sessionDate, { color: textSecondary }]}>{item.date}</Text>
                        </View>
                        <View style={styles.sessionRight}>
                            <Text style={[styles.sessionValue, { color: textPrimary }]}>₹{item.cost}</Text>
                            <Text style={[styles.sessionSub, { color: textSecondary }]}>{item.kWh} kWh</Text>
                        </View>
                    </View>

                    {isExpanded && (
                        <View style={[styles.expandedContent, { borderTopColor: borderColor }]}>
                            <View style={styles.grid}>
                                <View style={styles.gridItem}>
                                    <Clock size={12} color={textSecondary} />
                                    <Text style={[styles.gridLabel, { color: textSecondary }]}>Duration</Text>
                                    <Text style={[styles.gridValue, { color: textPrimary }]}>{item.duration}</Text>
                                </View>
                                {item.currentSoc !== undefined && (
                                    <View style={styles.gridItem}>
                                        <Zap size={12} color={textSecondary} />
                                        <Text style={[styles.gridLabel, { color: textSecondary }]}>Final SOC</Text>
                                        <Text style={[styles.gridValue, { color: COLORS.successGreen }]}>{item.currentSoc}%</Text>
                                    </View>
                                )}
                                {item.connectorId && (
                                    <View style={styles.gridItem}>
                                        <Text style={[styles.gridLabel, { color: textSecondary }]}>Connector</Text>
                                        <Text style={[styles.gridValue, { color: textPrimary }]}>{item.connectorId}</Text>
                                    </View>
                                )}
                                {item.estimatedCompletion ? (
                                    <View style={styles.gridItem}>
                                        <CheckCircle size={12} color={COLORS.successGreen} />
                                        <Text style={[styles.gridLabel, { color: textSecondary }]}>Status</Text>
                                        <Text style={[styles.gridValue, { color: COLORS.successGreen }]}>{item.estimatedCompletion}</Text>
                                    </View>
                                ) : null}
                            </View>
                            <TouchableOpacity style={styles.invoiceBtn}>
                                <Text style={styles.invoiceText}>Download Invoice</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Pressable>
            </GlassCard>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textPrimary }]}>Bookings & History</Text>
            </View>

            <View style={styles.tabBar}>
                {TABS.map(t => (
                    <TouchableOpacity
                        key={t}
                        onPress={() => setActiveTab(t)}
                        style={[styles.tab, activeTab === t && { borderBottomColor: COLORS.brandBlue }]}
                    >
                        <Text style={[styles.tabText, { color: activeTab === t ? COLORS.brandBlue : textSecondary }]}>
                            {t}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator color={COLORS.brandBlue} size="large" />
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(item, index) => `${item.source}-${item.id}-${index}`}
                    renderItem={renderItem}
                    onRefresh={() => fetchData(true)}
                    refreshing={loading}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: textSecondary }]}>No {activeTab.toLowerCase()} items found</Text>
                        </View>
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
                            <AlertTriangle size={28} color={COLORS.alertRed} />
                        </View>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>
                            {cancelTarget?.source === 'session' ? 'Stop Session' : 'Cancel Booking'}
                        </Text>
                        <Text style={[styles.modalSub, { color: textSecondary }]}>
                            {cancelTarget?.source === 'session'
                                ? 'Are you sure you want to stop this charging session?'
                                : 'Cancelling within 15 mins incurs a ₹20 penalty. Do you want to proceed?'}
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: COLORS.alertRed, borderColor: COLORS.alertRed }]}
                                onPress={submitCancel}
                                disabled={cancelling}
                            >
                                {cancelling ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                                        {cancelTarget?.source === 'session' ? 'Yes, Stop' : 'Yes, Cancel'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalCancel}
                                onPress={() => setCancelTarget(null)}
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
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, marginBottom: SPACING.md },
    title: { ...TYPOGRAPHY.hero, fontSize: 26 },
    tabBar: { flexDirection: 'row', paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText: { ...TYPOGRAPHY.label, fontWeight: '700', fontSize: 13 },
    listContent: { paddingHorizontal: SPACING.lg, paddingBottom: 120 },
    bookingCard: { padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    headerInfo: { flex: 1 },
    bookingTime: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 16 },
    bookingStation: { ...TYPOGRAPHY.label, fontSize: 12, marginTop: 2 },
    bookingDetails: { marginBottom: SPACING.md },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { ...TYPOGRAPHY.label, fontSize: 13 },
    actionRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
    actionBtnText: { ...TYPOGRAPHY.label, fontWeight: '700', fontSize: 12 },
    navigateBtn: { alignSelf: 'flex-start', paddingTop: SPACING.sm },
    navigateText: { ...TYPOGRAPHY.body, color: COLORS.brandBlue, fontWeight: '700', fontSize: 13 },
    sessionCard: { borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm, overflow: 'hidden' },
    sessionMain: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
    sessionInfo: { flex: 1, marginRight: SPACING.sm },
    sessionStation: { ...TYPOGRAPHY.body, fontWeight: '600', fontSize: 14 },
    sessionDate: { ...TYPOGRAPHY.label, fontSize: 11, marginTop: 2 },
    sessionRight: { alignItems: 'flex-end' },
    sessionValue: { ...TYPOGRAPHY.body, fontWeight: '700' },
    sessionSub: { ...TYPOGRAPHY.label, fontSize: 11 },
    expandedContent: { borderTopWidth: 1, padding: SPACING.md },
    grid: { flexDirection: 'row', gap: SPACING.xl, marginBottom: SPACING.md },
    gridItem: { gap: 2 },
    gridLabel: { ...TYPOGRAPHY.label, fontSize: 10 },
    gridValue: { ...TYPOGRAPHY.body, fontWeight: '600', fontSize: 13 },
    invoiceBtn: { alignSelf: 'flex-start' },
    invoiceText: { ...TYPOGRAPHY.label, color: COLORS.brandBlue, fontWeight: '700' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { ...TYPOGRAPHY.body, opacity: 0.6 },
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

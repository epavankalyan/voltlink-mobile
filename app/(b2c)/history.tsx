import React, { useEffect, useState } from 'react';
import {
    StyleSheet, View, FlatList, Text, TouchableOpacity, Alert, Pressable, ActivityIndicator, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Clock, Star, Calendar, XCircle } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { useThemeStore } from '../../store/themeStore';
import { getUserSessions } from '../../services/b2c.service';
import { getBookings, cancelBooking } from '../../services/booking.service';
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
};

export default function HistoryScreen() {
    const router = useRouter();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState('Active');
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<HistoryItem[]>([]);

    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    const fetchData = async (forceRefresh: boolean = false) => {
        setLoading(true);
        try {
            if (activeTab === 'Active') {
                // Fetch both pending bookings and active sessions
                const [bookingsResponse, sessions] = await Promise.all([
                    getBookings({ status: 'pending' }, forceRefresh),
                    getUserSessions(undefined, 'active', forceRefresh)
                ]);

                const bookings = bookingsResponse.data || [];

                const mappedItems: HistoryItem[] = [
                    ...sessions.map((s: any) => ({
                        id: s.id,
                        status: 'active',
                        time: 'Charging Now',
                        station: s.station_name || 'Charging Station',
                        type: s.session_type || 'Charging',
                        cost: s.total_cost,
                        kWh: s.kwh
                    })),
                    ...bookings.map((b: any) => ({
                        id: b.id,
                        status: 'pending',
                        time: format(new Date(b.booking_time), 'hh:mm a') + ' Today',
                        station: b.connector?.station_name || 'Booked Station',
                        type: b.connector?.connector_type || 'Reserved'
                    }))
                ];
                setItems(mappedItems);
            } else {
                const sessions = await getUserSessions(undefined, 'completed', forceRefresh);
                const mappedItems: HistoryItem[] = sessions.map((s: any) => ({
                    id: s.id,
                    date: format(new Date(s.start_time), 'dd MMM yyyy'),
                    station: s.station_name || 'Charging Station',
                    kWh: s.kwh,
                    cost: s.total_cost,
                    duration: s.end_time ? `${Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000)} min` : 'N/A',
                    rating: 5 // Default for now
                }));
                setItems(mappedItems);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
            Alert.alert('Error', 'Failed to load history data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const handleCancelBooking = (id: string) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Cancelling within 15 minutes of the slot incurs a ₹20 penalty. Do you want to proceed?');
            if (confirmed) {
                (async () => {
                    try {
                        setLoading(true);
                        await cancelBooking(id, { reason: 'Cancelled by user' });
                        window.alert('Your booking has been cancelled and a ₹20 penalty has been applied.');
                        fetchData(true);
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
                            fetchData(true);
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

    const renderItem = ({ item }: { item: HistoryItem }) => {
        if (activeTab === 'Active') {
            const isActive = item.status === 'active';
            return (
                <View style={{ marginBottom: SPACING.md }}>
                    <GlassCard style={{ ...(styles.bookingCard as any), padding: 0 }} intensity={25}>

                        {!isActive && (
                            <TouchableOpacity
                                onPress={() => handleCancelBooking(item.id)}
                                style={{ position: 'absolute', right: SPACING.lg, top: SPACING.lg, zIndex: 10 }}
                            >
                                <XCircle size={22} color={COLORS.alertRed} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => router.push({
                                pathname: '/(b2c)/session',
                                params: { sessionId: item.id }
                            })}
                            style={{ padding: SPACING.lg }}
                        >
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconBox, { backgroundColor: isActive ? COLORS.successGreen + '20' : COLORS.brandBlue + '20' }]}>
                                    {isActive ? <Zap size={18} color={COLORS.successGreen} /> : <Calendar size={18} color={COLORS.brandBlue} />}
                                </View>
                                <View style={styles.headerInfo}>
                                    <Text style={[styles.bookingTime, { color: textPrimary }]}>{item.time}</Text>
                                    <Text style={[styles.bookingStation, { color: textSecondary }]}>{item.station}</Text>
                                </View>
                                {!isActive && <View style={{ width: 22 }} />}
                            </View>

                            <View style={styles.bookingDetails}>
                                <View style={styles.detailRow}>
                                    <Zap size={14} color={isActive ? COLORS.successGreen : COLORS.brandBlue} />
                                    <Text style={[styles.detailText, { color: textSecondary }]}>
                                        {item.type} {item.cost ? `· ₹${item.cost}` : ''} {item.kWh ? `· ${item.kWh} kWh` : ''}
                                    </Text>
                                </View>
                            </View>

                            {!isActive && (
                                <View style={styles.navigateBtn}>
                                    <Text style={styles.navigateText}>View Directions →</Text>
                                </View>
                            )}
                        </TouchableOpacity>
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
                                <View style={styles.gridItem}>
                                    <Star size={12} color={COLORS.warningOrange} />
                                    <Text style={[styles.gridLabel, { color: textSecondary }]}>Rating</Text>
                                    <Text style={[styles.gridValue, { color: textPrimary }]}>{'★'.repeat(item.rating || 0)}</Text>
                                </View>
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
                    keyExtractor={(item) => item.id}
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
    emptyText: { ...TYPOGRAPHY.body, opacity: 0.6 }
});

import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Zap, Clock, CheckCircle } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { useThemeStore } from '../../store/themeStore';
import { getStationSlots, SlotInfo, ConnectorSlots } from '../../services/session.service';
import { createBooking } from '../../services/booking.service';
import { useVehicleStore } from '../../store/vehicleStore';
import { getStationById, getAIRecommendations } from '../../services/stations.service';

const DEFAULT_USER_ID = parseInt(process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '11', 10);

export default function DriverBooking() {
    const { theme } = useThemeStore();
    const { currentVehicleId } = useVehicleStore();
    const isDark = theme === 'dark';
    const router = useRouter();
    const params = useLocalSearchParams<{ stationId?: string, rank?: string }>();
    const rank = params.rank;

    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [station, setStation] = useState<any>(null);
    const [connectorSlots, setConnectorSlots] = useState<ConnectorSlots[]>([]);
    const [allSlots, setAllSlots] = useState<(SlotInfo & { id: string })[]>([]);
    const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
    const [reason, setReason] = useState('');
    const [showReasonScreen, setShowReasonScreen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [firstRecommendation, setFirstRecommendation] = useState<any>(null);

    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const stationId = params.stationId || '1';
                const [stationData, slotsData] = await Promise.all([
                    getStationById(stationId),
                    getStationSlots(stationId),
                ]);
                setStation(stationData);
                setConnectorSlots(slotsData);

                // Flatten slots with unique IDs for the picker
                const flat = slotsData.flatMap((cs: ConnectorSlots, ci: number) =>
                    cs.slots.map((s: SlotInfo, si: number) => ({
                        ...s,
                        id: `${ci}-${si}`,
                        _connectorId: cs.connector_id,
                    }))
                );
                setAllSlots(flat as any);
                if (slotsData.length > 0) {
                    setSelectedConnectorId(slotsData[0].connector_id);

                    // Auto-select first available slot for any rank in driver flow
                    if (flat.length > 0) {
                        setSelectedSlot(flat[0].id);
                    }
                }

                // If rank=2, fetch first recommendation to show comparison
                if (rank === '2' && currentVehicleId) {
                    const recs = await getAIRecommendations(currentVehicleId);
                    if (recs.length > 0) setFirstRecommendation(recs[0]);
                }
            } catch (error) {
                console.error('Error fetching booking data:', error);
                Alert.alert('Error', 'Failed to load station info.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.stationId, rank, currentVehicleId]);

    // Auto-confirm if rank=1 and slot is selected
    useEffect(() => {
        if (rank === '1' && !loading && !confirmed && !submitting && selectedSlot && station) {
            handleConfirm();
        }
    }, [rank, loading, confirmed, submitting, selectedSlot, station]);

    // Get the first connector's data for display
    const connector = connectorSlots[0];
    const displaySlots = connector?.slots.map((s, i) => ({ ...s, id: `0-${i}` })) || [];

    const estimatedKwh = 28;
    const selectedPrice = displaySlots.find(s => s.id === selectedSlot)?.price_per_kwh
        || station?.pricePerKwh || 15;
    const estimatedCost = estimatedKwh * selectedPrice;
    const creditsEarned = Math.round(estimatedCost * 0.1);

    const handleConfirm = async () => {
        if (!selectedSlot || submitting) {
            if (!selectedSlot) Alert.alert('Select a Slot', 'Please pick an available time slot first.');
            return;
        }

        // If rank=2 and not yet showing reason screen, show it first
        if (rank === '2' && !showReasonScreen) {
            setShowReasonScreen(true);
            return;
        }

        // If showing reason screen but reason is empty, alert
        if (showReasonScreen && !reason.trim()) {
            Alert.alert('Reason Required', 'Please provide a reason for choosing this station.');
            return;
        }

        setSubmitting(true);
        scale.value = withSpring(0.95, {}, () => { scale.value = withSpring(1); });

        try {
            if (!currentVehicleId) throw new Error('No vehicle selected');

            const slot = displaySlots.find(s => s.id === selectedSlot);
            let timeStr = slot?.time || "12:00";
            let [hours, minutes] = timeStr.split(':');
            hours = hours || "12";
            minutes = minutes?.substring(0, 2) || "00";

            if (timeStr.toLowerCase().includes('pm') && parseInt(hours) < 12) {
                hours = (parseInt(hours) + 12).toString();
            } else if (timeStr.toLowerCase().includes('am') && parseInt(hours) === 12) {
                hours = "00";
            }

            const now = new Date();
            now.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            await createBooking({
                connector_id: selectedConnectorId || connector?.connector_id || '',
                vehicle_id: currentVehicleId,
                user_id: DEFAULT_USER_ID,
                booking_time: now.toISOString(),
            });
            setConfirmed(true);
            setTimeout(() => {
                router.replace('/(driver)/history');
            }, 1800);
        } catch (error) {
            console.error('Error creating session:', error);
            Alert.alert('Error', 'Failed to start session. Please try again.');
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.brandBlue} />
            </SafeAreaView>
        );
    }

    if (confirmed) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
                <CheckCircle size={80} color={COLORS.successGreen} />
                <Text style={[styles.confirmedTitle, { color: textPrimary }]}>Booking Confirmed!</Text>
                <Text style={[styles.confirmedSub, { color: textSecondary, marginTop: 12 }]}>
                    Redirecting to History Screen...
                </Text>
            </SafeAreaView>
        );
    }

    if (showReasonScreen) {
        const lossPrice = (station?.pricePerKwh ?? 0) - (firstRecommendation?.pricePerKwh ?? 0);
        const lossDist = (station?.distanceKm ?? 0) - (firstRecommendation?.distanceKm ?? 0);

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setShowReasonScreen(false)} style={styles.backBtn}>
                        <ArrowLeft size={24} color={textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: textPrimary }]}>Confirmation</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.reasonTitle, { color: textPrimary }]}>
                        Why did you choose the second recommendation instead of the first?
                    </Text>

                    <GlassCard style={styles.lossCard as any} intensity={15}>
                        <Text style={[styles.lossHeader, { color: COLORS.alertRed }]}>Potential Loss Summary</Text>

                        <View style={styles.lossItem}>
                            <Text style={[styles.lossLabel, { color: textSecondary }]}>Higher Price</Text>
                            <Text style={[styles.lossValue, { color: COLORS.alertRed }]}>+₹{lossPrice > 0 ? lossPrice.toFixed(2) : '0.00'}/kWh</Text>
                        </View>

                        <View style={styles.lossItem}>
                            <Text style={[styles.lossLabel, { color: textSecondary }]}>Further Distance</Text>
                            <Text style={[styles.lossValue, { color: COLORS.alertRed }]}>+{lossDist > 0 ? lossDist.toFixed(1) : '0.0'} km</Text>
                        </View>

                        <View style={styles.lossItem}>
                            <Text style={[styles.lossLabel, { color: textSecondary }]}>Longer Wait</Text>
                            <Text style={[styles.lossValue, { color: COLORS.alertRed }]}>+15 min</Text>
                        </View>
                    </GlassCard>

                    <Text style={[styles.sectionLabel, { color: textSecondary, marginTop: SPACING.xl }]}>Reason for Selection</Text>
                    <TextInput
                        style={[styles.reasonInput, { color: textPrimary, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: borderColor }]}
                        placeholder="Enter your reason here..."
                        placeholderTextColor={textSecondary}
                        multiline
                        numberOfLines={4}
                        value={reason}
                        onChangeText={setReason}
                    />

                    <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: reason.trim() ? COLORS.brandBlue : 'rgba(255,255,255,0.1)' }]}
                        onPress={handleConfirm}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={[styles.confirmText, { color: reason.trim() ? '#000' : textSecondary }]}>
                                Confirm and Book
                            </Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textPrimary }]}>Book a Slot</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Station Hero */}
                <GlassCard style={styles.stationCard as any} intensity={30}>
                    <Text style={[styles.stationName, { color: textPrimary }]}>{station?.name || 'Charging Station'}</Text>
                    <Text style={[styles.cpoName, { color: COLORS.brandBlue }]}>{station?.cpoName || 'VoltLink Partner'}</Text>
                    <View style={styles.stationMeta}>
                        <View style={styles.metaItem}>
                            <MapPin size={14} color={textSecondary} />
                            <Text style={[styles.metaText, { color: textSecondary }]}>{station?.distanceKm || '?'} km away</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Clock size={14} color={textSecondary} />
                            <Text style={[styles.metaText, { color: textSecondary }]}>{station?.etaMinutes || '?'} min ETA</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Zap size={14} color={COLORS.successGreen} />
                            <Text style={[styles.metaText, { color: textSecondary }]}>
                                {connector?.connector_type || 'CCS2'} {connector?.power_kw ? `${connector.power_kw}kW` : ''}
                            </Text>
                        </View>
                    </View>
                </GlassCard>

                {/* Driver Booking: Slots and Estimates are hidden to streamline flow */}
                <View style={{ height: 10 }} />

                <GlassCard style={styles.stationCard as any} intensity={15}>
                    <Text style={[styles.sectionLabel, { color: textSecondary, marginTop: 0 }]}>Booking Details</Text>
                    <View style={styles.estimateRow}>
                        <Text style={[styles.estimateLabel, { color: textSecondary }]}>Selected Slot</Text>
                        <Text style={[styles.estimateValue, { color: COLORS.brandBlue }]}>
                            {displaySlots.find(s => s.id === selectedSlot)?.time || 'Auto-selected'}
                        </Text>
                    </View>
                    <View style={styles.estimateRow}>
                        <Text style={[styles.estimateLabel, { color: textSecondary }]}>Est. kWh</Text>
                        <Text style={[styles.estimateValue, { color: textPrimary }]}>{estimatedKwh} kWh</Text>
                    </View>
                    <View style={styles.estimateRow}>
                        <Text style={[styles.estimateLabel, { color: textSecondary }]}>Estimated Cost</Text>
                        <Text style={[styles.estimateTotal, { color: textPrimary, fontSize: 18 }]}>₹{estimatedCost}</Text>
                    </View>
                </GlassCard>

                {/* Confirm Button */}
                <Animated.View style={animStyle}>
                    <TouchableOpacity
                        style={[
                            styles.confirmBtn,
                            { backgroundColor: selectedSlot ? COLORS.brandBlue : 'rgba(255,255,255,0.1)' }
                        ]}
                        onPress={handleConfirm}
                        activeOpacity={0.85}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={[
                                styles.confirmText,
                                { color: selectedSlot ? '#000' : COLORS.textMutedDark }
                            ]}>
                                {rank === '2' ? 'Book with Reason' : 'Confirm Booking'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    backBtn: { padding: 4, width: 40 },
    title: { ...TYPOGRAPHY.sectionHeader, fontSize: 20, flex: 1, textAlign: 'center' },
    content: { paddingHorizontal: SPACING.lg, paddingBottom: 120 },
    stationCard: {
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: SPACING.xl,
    },
    stationName: { ...TYPOGRAPHY.sectionHeader, fontSize: 18, marginBottom: 4 },
    cpoName: { ...TYPOGRAPHY.label, fontWeight: '700', marginBottom: SPACING.md },
    stationMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { ...TYPOGRAPHY.label },
    sectionLabel: { ...TYPOGRAPHY.label, fontWeight: '700', marginBottom: SPACING.md, marginTop: SPACING.sm },
    slotScroll: { paddingBottom: SPACING.xl, gap: SPACING.sm },
    slotCard: {
        width: 90,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        alignItems: 'center',
    },
    slotUnavailable: {
        opacity: 0.4,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'transparent',
    },
    slotTime: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 14 },
    slotPrice: { ...TYPOGRAPHY.label, marginTop: 4 },
    estimateCard: {
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        marginBottom: SPACING.lg,
    },
    estimateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    estimateDivider: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        marginTop: SPACING.sm,
        paddingTop: SPACING.md,
    },
    estimateLabel: { ...TYPOGRAPHY.body },
    estimateValue: { ...TYPOGRAPHY.body, fontWeight: '600' },
    estimateTotal: { ...TYPOGRAPHY.hero, fontSize: 22, fontWeight: '700' },
    creditsEarned: { ...TYPOGRAPHY.body, fontWeight: '700', color: COLORS.successGreen },
    confirmBtn: {
        height: 56, marginTop: SPACING.md, marginBottom: SPACING.xl,
        borderRadius: BORDER_RADIUS.xl,
        justifyContent: 'center', alignItems: 'center',
    },
    confirmText: { ...TYPOGRAPHY.body, fontSize: 16, fontWeight: '700' },
    confirmedTitle: { ...TYPOGRAPHY.hero, fontSize: 28, marginTop: SPACING.xl, textAlign: 'center' },
    confirmedSub: { ...TYPOGRAPHY.body, marginTop: SPACING.sm, textAlign: 'center' },
    reasonTitle: { ...TYPOGRAPHY.sectionHeader, fontSize: 20, marginBottom: SPACING.lg, lineHeight: 28 },
    lossCard: { padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, backgroundColor: 'rgba(255,68,68,0.05)', borderWidth: 1, borderColor: 'rgba(255,68,68,0.2)' },
    lossHeader: { ...TYPOGRAPHY.label, fontWeight: '800', marginBottom: SPACING.md, letterSpacing: 0.5 },
    lossItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
    lossLabel: { ...TYPOGRAPHY.body, fontSize: 14 },
    lossValue: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 14 },
    reasonInput: { height: 120, borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.md, textAlignVertical: 'top', ...TYPOGRAPHY.body, fontSize: 14 },
});

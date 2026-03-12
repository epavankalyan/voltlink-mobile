import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ArrowLeft, MapPin, Zap, Clock, CheckCircle,
    Car, BatteryCharging, Plug, IndianRupee, CalendarCheck, Bot
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { useThemeStore } from '../../store/themeStore';
import { getStationSlots, SlotInfo, ConnectorSlots } from '../../services/session.service';
import { createBooking } from '../../services/booking.service';
import { useVehicleStore } from '../../store/vehicleStore';
import { getStationById } from '../../services/stations.service';

const DEFAULT_USER_ID = parseInt(process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '11', 10);

export default function B2CBooking() {
    const { theme } = useThemeStore();
    const { currentVehicleId } = useVehicleStore();
    const isDark = theme === 'dark';
    const router = useRouter();
    const params = useLocalSearchParams<{ stationId?: string, isAI?: string }>();
    const isAI = params.isAI === 'true';

    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [station, setStation] = useState<any>(null);
    const [connectorSlots, setConnectorSlots] = useState<ConnectorSlots[]>([]);
    const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
    const [taskStep, setTaskStep] = useState(0); // 0 to 7 (0 means not started)
    const [submitting, setSubmitting] = useState(false);
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (confirmed) {
            // Initial jump to top
            setTimeout(() => {
                scrollRef.current?.scrollTo({ y: 0, animated: false });
            }, 50);
        }
    }, [confirmed]);

    useEffect(() => {
        if (confirmed && taskStep > 0 && scrollRef.current) {
            // Auto-follow: Scroll to keep the active step visible
            // Roughly 100px for header + 80px per step
            let stepY = Math.max(0, (taskStep - 2) * 85);

            // If we reached the final step, scroll just enough to clear the bottom menu nicely
            if (taskStep === 7) {
                stepY += 260;
            }

            scrollRef.current.scrollTo({ y: stepY, animated: true });
        }
    }, [taskStep, confirmed]);

    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;

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

                if (slotsData.length > 0) {
                    const firstConnector = slotsData[0];
                    setSelectedConnectorId(firstConnector.connector_id);

                    // If AI mode, auto-select first slot and proceed
                    if (isAI && firstConnector.slots.length > 0) {
                        setSelectedSlot('0-0'); // Use same ID pattern as displaySlots
                    }
                }
            } catch (error) {
                console.error('Error fetching booking data:', error);
                Alert.alert('Error', 'Failed to load station info.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.stationId, isAI]);

    // Auto-confirm if isAI and data is ready
    useEffect(() => {
        if (isAI && !loading && !confirmed && !submitting && selectedSlot && station) {
            handleConfirm();
        }
    }, [isAI, loading, confirmed, submitting, selectedSlot, station]);

    const connector = connectorSlots[0];
    const displaySlots = connector?.slots.map((s, i) => ({ ...s, id: `0-${i}` })) || [];

    const estimatedKwh = 24;
    const selectedPrice = displaySlots.find(s => s.id === selectedSlot)?.price_per_kwh
        || station?.pricePerKwh || 15;
    const estimatedCost = estimatedKwh * selectedPrice;
    const creditsEarned = Math.round(estimatedCost * 0.12);

    const handleConfirm = async () => {
        if (!selectedSlot || submitting) {
            if (!selectedSlot) Alert.alert('Select a Slot', 'Please choose an available time slot first.');
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
                vehicle_id: parseInt(currentVehicleId || '0', 10),
                user_id: DEFAULT_USER_ID,
                booking_time: now.toISOString(),
            });

            setConfirmed(true);
            setTaskStep(1); // Set first step immediately

            // Start the task loop animation for remaining steps
            let step = 2;
            const interval = setInterval(() => {
                setTaskStep(step);
                if (step === 7) {
                    clearInterval(interval);
                    // Auto-navigate to history after a short delay
                    setTimeout(() => {
                        router.replace('/b2c/history');
                    }, 2000);
                }
                step++;
            }, 1000); // 1s per step for better visibility
            setSubmitting(false); // Reset in case of future use, though we switch views
        } catch (error: any) {
            setSubmitting(false);
            console.error('Booking confirmation fatal error:', error);
            Alert.alert('Error', error.message || 'Something went wrong while confirming your booking.');
        }
    };

    // Auto-redirect manual bookings to history
    useEffect(() => {
        if (confirmed && !isAI) {
            const timer = setTimeout(() => {
                router.replace('/b2c/history');
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [confirmed, isAI]);

    if (loading && !confirmed) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
                <ActivityIndicator color={COLORS.brandBlue} size="large" />
                {isAI && (
                    <Text style={[styles.loadingText, { color: textSecondary, marginTop: 20 }]}>
                        🤖 AI is finding the best slot for you...
                    </Text>
                )}
            </SafeAreaView>
        );
    }

    if (confirmed && !isAI) {
        // Simple success view for manual bookings
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]} edges={['top']}>
                <CheckCircle size={80} color={COLORS.successGreen} />
                <Text style={[styles.successTitle, { color: textPrimary, marginTop: 20 }]}>Booking Confirmed!</Text>
                <Text style={[styles.successSub, { color: textSecondary, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }]}>
                    Redirecting to your history screen...
                </Text>
            </SafeAreaView>
        );
    }

    if (confirmed) {
        const steps = [
            { title: 'Vehicle Detected', sub: 'Reading vehicle telemetry', detail: 'Battery: 35% · Capacity: 72 kWh · Location acquired', Icon: Car },
            { title: 'Battery Analyzed', sub: 'Determining charge type', detail: 'Battery < 50% → AC Fast charging recommended', Icon: BatteryCharging },
            { title: 'Route Scanned', sub: 'Finding CPOs within 5 km', detail: '3 CPOs found on Bangalore → Chennai route', Icon: MapPin },
            { title: 'Charger Matched', sub: 'Checking slot availability', detail: 'AC Fast @ ChargeZone Hub — slot in 30 min', Icon: Plug },
            { title: 'Price Calculated', sub: 'Applying dynamic pricing', detail: '₹8.00/kWh · Off-peak discount applied (−20%)', Icon: IndianRupee },
            { title: 'Slot Booked', sub: 'Reservation confirmed', detail: 'Booked 14:30–15:30 · Est. cost ₹259.20', Icon: CalendarCheck },
            { title: 'Charging Active', sub: 'Session in progress', detail: 'Charging to 80% · ETA 47 min remaining', Icon: Zap },
        ];

        return (
            <SafeAreaView key="task-loop" style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
                <View style={styles.loopHeader}>
                    <GlassCard style={styles.botBadge as any} intensity={15}>
                        <Bot size={16} color={COLORS.brandBlue} />
                        <Text style={[styles.botText, { color: textPrimary }]}>VoltLink AI Optimizer</Text>
                    </GlassCard>
                    <Text style={[styles.loopTitle, { color: textPrimary }]}>Processing your booking...</Text>
                </View>

                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={[styles.loopContent, { paddingBottom: 200 }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.timelineContainer}>
                        {steps.map((s, i) => {
                            const stepIdx = i + 1;
                            const isActive = taskStep === stepIdx;
                            const isCompleted = taskStep > stepIdx;
                            const isLast = i === steps.length - 1;
                            const statusColor = isCompleted ? COLORS.successGreen : isActive ? COLORS.brandBlue : textSecondary;

                            return (
                                <View key={i} style={styles.stepRow}>
                                    {/* Icon Column with segments */}
                                    <View style={styles.iconCol}>
                                        {!isLast && (
                                            <View style={[
                                                styles.timelineSegment,
                                                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                                            ]} />
                                        )}
                                        {!isLast && isCompleted && (
                                            <View style={[styles.timelineSegmentProgress, { backgroundColor: COLORS.successGreen }]} />
                                        )}

                                        <View style={[
                                            styles.stepCircle,
                                            { borderColor: statusColor, backgroundColor: bg },
                                            isActive && styles.activeCircle
                                        ]}>
                                            <s.Icon size={20} color={statusColor} />
                                        </View>
                                    </View>

                                    {/* Content Column */}
                                    <View style={styles.stepMain}>
                                        <View style={styles.stepHeaderRow}>
                                            <Text style={[styles.stepTitle, { color: isCompleted || isActive ? textPrimary : textSecondary }]}>
                                                {s.title}
                                            </Text>
                                            {isCompleted && <CheckCircle size={16} color={COLORS.successGreen} style={{ marginLeft: 8 }} />}
                                        </View>
                                        <Text style={[styles.stepSub, { color: textSecondary }]}>{s.sub}</Text>

                                        {(isActive || isCompleted) && (
                                            <GlassCard style={styles.detailBadge as any} intensity={isActive ? 20 : 10}>
                                                <Text style={[styles.detailText, { color: textSecondary }]}>{s.detail}</Text>
                                            </GlassCard>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {taskStep === 7 && (
                        <View style={[styles.successBox, { backgroundColor: isDark ? 'rgba(0,255,136,0.08)' : 'rgba(0,255,136,0.05)' }]}>
                            <CheckCircle color={COLORS.successGreen} size={32} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.successTitle, { color: textPrimary }]}>Success!</Text>
                                <Text style={[styles.successSub, { color: textSecondary }]}>
                                    Your booking at {station?.name} is confirmed and AI has initiated the session.
                                </Text>

                                <Text style={[styles.successSub, { color: textSecondary, marginTop: 12, fontStyle: 'italic' }]}>
                                    Redirecting you to the history screen...
                                </Text>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView key="booking-form" style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
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
                            <Text style={[styles.metaText, { color: textSecondary }]}>{station?.distanceKm || '?'} km</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Clock size={14} color={textSecondary} />
                            <Text style={[styles.metaText, { color: textSecondary }]}>{station?.etaMinutes || '?'} min</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Zap size={14} color={COLORS.successGreen} />
                            <Text style={[styles.metaText, { color: textSecondary }]}>
                                {connector?.connector_type || 'CCS2'} {connector?.power_kw ? `${connector.power_kw}kW` : ''}
                            </Text>
                        </View>
                    </View>
                </GlassCard>

                {/* Slot Picker */}
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>Select Time Slot</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.slotScroll}
                >
                    {displaySlots.map((slot) => {
                        const isSelected = selectedSlot === slot.id;
                        return (
                            <TouchableOpacity
                                key={slot.id}
                                onPress={() => slot.available && setSelectedSlot(slot.id)}
                                style={[
                                    styles.slotCard,
                                    !slot.available && styles.slotUnavailable,
                                    isSelected && { backgroundColor: COLORS.brandBlue, borderColor: COLORS.brandBlue },
                                    !isSelected && slot.available && {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                                        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                                    }
                                ]}
                                activeOpacity={slot.available ? 0.7 : 1}
                            >
                                <Text style={[
                                    styles.slotTime,
                                    { color: isSelected ? '#000' : slot.available ? textPrimary : textSecondary }
                                ]}>
                                    {slot.time}
                                </Text>
                                <Text style={[
                                    styles.slotPrice,
                                    { color: isSelected ? '#000' : slot.available ? COLORS.successGreen : textSecondary }
                                ]}>
                                    {slot.available ? `₹${slot.price_per_kwh}/kWh` : 'Booked'}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Cost Estimate */}
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>Cost Estimate</Text>
                <GlassCard style={styles.estimateCard as any} intensity={25}>
                    <View style={styles.estimateRow}>
                        <Text style={[styles.estimateLabel, { color: textSecondary }]}>Estimated kWh</Text>
                        <Text style={[styles.estimateValue, { color: textPrimary }]}>{estimatedKwh} kWh</Text>
                    </View>
                    <View style={styles.estimateRow}>
                        <Text style={[styles.estimateLabel, { color: textSecondary }]}>Rate</Text>
                        <Text style={[styles.estimateValue, { color: textPrimary }]}>₹{selectedPrice}/kWh</Text>
                    </View>
                    <View style={[styles.estimateRow, styles.estimateDivider]}>
                        <Text style={[styles.estimateLabel, { color: textSecondary }]}>Estimated cost</Text>
                        <Text style={[styles.estimateTotal, { color: textPrimary }]}>₹{estimatedCost}</Text>
                    </View>
                    <View style={styles.estimateRow}>
                        <Text style={[styles.estimateLabel, { color: textSecondary }]}>VoltCredits earned</Text>
                        <Text style={styles.creditsEarned}>+{creditsEarned} credits</Text>
                    </View>
                </GlassCard>

                {/* Confirm Button */}
                <Animated.View style={animStyle}>
                    <TouchableOpacity
                        onPress={handleConfirm}
                        disabled={!selectedSlot || submitting}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={!selectedSlot || submitting ? ['#444', '#333'] : [COLORS.brandBlue, '#00A3FF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.confirmBtn}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.confirmText}>Confirm Booking</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { padding: 4, width: 40 },
    title: { ...TYPOGRAPHY.sectionHeader, fontSize: 20, flex: 1, textAlign: 'center' },
    content: { paddingHorizontal: SPACING.lg, paddingBottom: 120 },
    stationCard: {
        padding: SPACING.lg, borderRadius: BORDER_RADIUS.xl, marginBottom: SPACING.xl,
    },
    stationName: { ...TYPOGRAPHY.sectionHeader, fontSize: 18, marginBottom: 4 },
    cpoName: { ...TYPOGRAPHY.label, fontWeight: '700', marginBottom: SPACING.md },
    stationMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { ...TYPOGRAPHY.label },
    sectionLabel: { ...TYPOGRAPHY.label, fontWeight: '700', marginBottom: SPACING.md, marginTop: SPACING.sm },
    slotScroll: { paddingBottom: SPACING.xl, gap: SPACING.sm },
    slotCard: {
        width: 90, paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm,
        borderRadius: BORDER_RADIUS.md, borderWidth: 1, alignItems: 'center',
    },
    slotUnavailable: {
        opacity: 0.4, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'transparent',
    },
    slotTime: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 14 },
    successBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        gap: SPACING.md,
        marginTop: SPACING.xl,
    },
    successTitle: {
        ...TYPOGRAPHY.sectionHeader,
        fontSize: 18,
        fontWeight: '700',
    },
    successSub: {
        ...TYPOGRAPHY.label,
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
    },
    goToSessionBtn: {
        marginTop: SPACING.xl,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
    },
    sessionBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 10,
    },
    sessionBtnText: {
        ...TYPOGRAPHY.body,
        fontWeight: '800',
        fontSize: 16,
        color: '#000',
    },
    loadingText: {
        ...TYPOGRAPHY.body,
        textAlign: 'center',
        fontWeight: '600',
    },
    innerSessionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        paddingVertical: 4,
    },
    innerSessionText: {
        ...TYPOGRAPHY.label,
        color: COLORS.brandBlue,
        fontWeight: '800',
        fontSize: 14,
    },
    slotPrice: { ...TYPOGRAPHY.label, marginTop: 4 },
    estimateCard: {
        padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.lg,
    },
    estimateRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingVertical: SPACING.sm,
    },
    estimateDivider: {
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
        marginTop: SPACING.sm, paddingTop: SPACING.md,
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

    // Task Loop Styles
    loopHeader: { paddingTop: SPACING.lg, paddingBottom: SPACING.sm, alignItems: 'center' },
    botBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 20, marginBottom: SPACING.sm,
    },
    botText: { ...TYPOGRAPHY.label, fontWeight: '800', fontSize: 11 },
    loopTitle: { ...TYPOGRAPHY.hero, fontSize: 22, textAlign: 'center' },
    loopContent: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: 200 },
    timelineContainer: { marginTop: SPACING.md },
    timelineSegment: {
        position: 'absolute', left: 21, top: 40, bottom: -24,
        width: 2, borderRadius: 1, zIndex: 1,
    },
    timelineSegmentProgress: {
        position: 'absolute', left: 21, top: 40, bottom: -24,
        width: 2, borderRadius: 1, zIndex: 2,
    },
    stepRow: { flexDirection: 'row', marginBottom: 24, minHeight: 60 },
    iconCol: { width: 44, alignItems: 'center', zIndex: 10 },
    stepCircle: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, zIndex: 10,
    },
    activeCircle: {
        shadowColor: COLORS.brandBlue,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8, shadowRadius: 10,
        elevation: 10,
    },
    stepMain: { flex: 1, paddingLeft: SPACING.md, paddingTop: 6 },
    stepHeaderRow: { flexDirection: 'row', alignItems: 'center' },
    stepTitle: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 16 },
    stepSub: { ...TYPOGRAPHY.label, fontSize: 12, marginTop: 2, opacity: 0.8 },
    detailBadge: {
        marginTop: 8, paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 8, alignSelf: 'flex-start',
    },
    detailText: { ...TYPOGRAPHY.label, fontSize: 11, fontStyle: 'italic' },
    completionSummary: {
        backgroundColor: 'rgba(52, 199, 89, 0.08)',
        borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg,
        alignItems: 'center', marginTop: SPACING.md,
        borderWidth: 1, borderColor: 'rgba(52, 199, 89, 0.2)',
    },
    summaryTitle: { ...TYPOGRAPHY.sectionHeader, fontSize: 18, marginTop: 8 },
    summarySub: { ...TYPOGRAPHY.label, marginTop: 4 },
});

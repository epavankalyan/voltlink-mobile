import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator
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
import { getStationById } from '../../services/stations.service';

const DEFAULT_USER_ID = parseInt(process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '11', 10);

export default function B2CBooking() {
    const { theme } = useThemeStore();
    const { currentVehicleId } = useVehicleStore();
    const isDark = theme === 'dark';
    const router = useRouter();
    const params = useLocalSearchParams<{ stationId?: string }>();

    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [station, setStation] = useState<any>(null);
    const [connectorSlots, setConnectorSlots] = useState<ConnectorSlots[]>([]);
    const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');

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
                    setSelectedConnectorId(slotsData[0].connector_id);
                }
            } catch (error) {
                console.error('Error fetching booking data:', error);
                Alert.alert('Error', 'Failed to load station info.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [params.stationId]);

    const connector = connectorSlots[0];
    const displaySlots = connector?.slots.map((s, i) => ({ ...s, id: `0-${i}` })) || [];

    const estimatedKwh = 24;
    const selectedPrice = displaySlots.find(s => s.id === selectedSlot)?.price_per_kwh
        || station?.pricePerKwh || 15;
    const estimatedCost = estimatedKwh * selectedPrice;
    const creditsEarned = Math.round(estimatedCost * 0.12);

    const handleConfirm = async () => {
        if (!selectedSlot) {
            Alert.alert('Select a Slot', 'Please choose an available time slot first.');
            return;
        }
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
                router.replace('/(b2c)/history');
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
                <Text style={[styles.confirmedSub, { color: textSecondary }]}>
                    Starting your session…
                </Text>
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
                        style={[
                            styles.confirmBtn,
                            { backgroundColor: selectedSlot ? COLORS.brandBlue : 'rgba(255,255,255,0.1)' }
                        ]}
                        onPress={handleConfirm}
                        activeOpacity={0.85}
                    >
                        <Text style={[
                            styles.confirmText,
                            { color: selectedSlot ? '#000' : COLORS.textMutedDark }
                        ]}>
                            Confirm Booking
                        </Text>
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
    confirmedTitle: { ...TYPOGRAPHY.hero, fontSize: 28, marginTop: SPACING.xl, textAlign: 'center' },
    confirmedSub: { ...TYPOGRAPHY.body, marginTop: SPACING.sm, textAlign: 'center' },
});

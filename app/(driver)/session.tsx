import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
    useSharedValue, withTiming, useAnimatedProps, withRepeat, withSequence
} from 'react-native-reanimated';
import { Zap, AlertTriangle, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { useThemeStore } from '../../store/themeStore';
import { getVehicleActiveSession, stopSession } from '../../services/session.service';
import { useVehicleStore } from '../../store/vehicleStore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 220;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '11';
const POLL_INTERVAL = 5000; // 5 seconds

export default function SessionScreen() {
    const { theme } = useThemeStore();
    const { currentVehicleId } = useVehicleStore();
    const isDark = theme === 'dark';
    const router = useRouter();

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sessionEnded, setSessionEnded] = useState(false);
    const [rating, setRating] = useState(0);
    const [ratingSubmitted, setRatingSubmitted] = useState(false);

    const progress = useSharedValue(0);
    const pulseOpacity = useSharedValue(1);

    // Pulse the ring
    useEffect(() => {
        pulseOpacity.value = withRepeat(
            withSequence(withTiming(0.4, { duration: 900 }), withTiming(1, { duration: 900 })),
            -1,
            true
        );
    }, []);

    // Poll active session
    const fetchSession = useCallback(async () => {
        if (!currentVehicleId) return;
        try {
            const data = await getVehicleActiveSession(currentVehicleId);
            setSession(data);
            const soc = data.current_soc ?? 0;
            progress.value = withTiming(soc / 100, { duration: 1000 });
            setLoading(false);
        } catch (error: any) {
            if (error.response?.status === 404) {
                // No active session — may have ended
                if (session) setSessionEnded(true);
            } else {
                console.error('Error polling session:', error);
            }
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        fetchSession();
        const timer = setInterval(fetchSession, POLL_INTERVAL);
        return () => clearInterval(timer);
    }, []);

    const animProps = useAnimatedProps(() => ({
        strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
        stroke: progress.value < 0.25 ? COLORS.alertRed
            : progress.value < 0.55 ? COLORS.warningOrange
                : COLORS.successGreen,
    }));

    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;

    const chargePercent = session?.current_soc ?? 0;
    const kwhDelivered = session?.kwh ?? 0;
    const estimatedCost = session?.total_cost?.toFixed(0) ?? '0';
    const stationName = session?.station_name || 'Charging Station';
    const connectorType = session?.connector?.connector_type || 'CCS2 DC Fast';
    const connectorId = session?.connector_id || '';
    const chargingRate = session?.charging_rate_kw ?? 0;

    // Calculate elapsed from start_time
    const elapsed = session?.start_time
        ? Math.round((Date.now() - new Date(session.start_time).getTime()) / 1000)
        : 0;

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}m ${s < 10 ? '0' : ''}${s}s`;
    };

    const timeRemainingMin = chargingRate > 0
        ? Math.max(0, Math.round(((100 - chargePercent) / 100 * (session?.vehicle?.battery_capacity_kwh || 40)) / chargingRate * 60))
        : Math.max(0, Math.round((100 - chargePercent) * 2.8));

    const handleStop = () => {
        Alert.alert('Stop Charging?', 'Are you sure you want to end this charging session?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Stop Session', style: 'destructive', onPress: async () => {
                    try {
                        if (session?.id) await stopSession(session.id);
                        setSessionEnded(true);
                    } catch (error) {
                        console.error('Error stopping session:', error);
                        Alert.alert('Error', 'Failed to stop session.');
                    }
                }
            }
        ]);
    };

    const handleRatingSubmit = () => {
        setRatingSubmitted(true);
        setTimeout(() => router.replace('/(driver)/dashboard'), 1500);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.brandBlue} />
                <Text style={[styles.chargeLabel, { color: textSecondary, marginTop: SPACING.md }]}>
                    Loading session…
                </Text>
            </SafeAreaView>
        );
    }

    if (sessionEnded && !ratingSubmitted) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
                <ScrollView contentContainerStyle={styles.ratingCenter}>
                    <View style={styles.ratingCard}>
                        <GlassCard style={styles.ratingInner as any} intensity={30}>
                            <Zap size={48} color={COLORS.successGreen} />
                            <Text style={[styles.ratingTitle, { color: textPrimary }]}>Session Complete</Text>
                            <Text style={[styles.ratingCost, { color: COLORS.brandBlue }]}>₹{estimatedCost} charged</Text>
                            <Text style={[styles.ratingKwh, { color: textSecondary }]}>{kwhDelivered} kWh delivered</Text>

                            <Text style={[styles.ratingPrompt, { color: textSecondary }]}>Rate your charging experience</Text>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map(n => (
                                    <TouchableOpacity key={n} onPress={() => setRating(n)}>
                                        <Star
                                            size={36}
                                            color={n <= rating ? COLORS.warningOrange : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
                                            fill={n <= rating ? COLORS.warningOrange : 'transparent'}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: rating > 0 ? COLORS.brandBlue : 'rgba(255,255,255,0.1)' }]}
                                onPress={handleRatingSubmit}
                            >
                                <Text style={{ color: rating > 0 ? '#000' : COLORS.textMutedDark, fontWeight: '700' }}>
                                    {rating > 0 ? 'Submit Rating' : 'Skip'}
                                </Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (ratingSubmitted) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={[styles.ratingTitle, { color: textPrimary }]}>Thanks for your feedback! 🎉</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Station Info */}
                <View style={styles.sessionHeader}>
                    <Text style={[styles.stationName, { color: textPrimary }]}>{stationName}</Text>
                    <View style={[styles.livePill, { backgroundColor: 'rgba(0,255,136,0.15)' }]}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                </View>
                <Text style={[styles.chargerId, { color: textSecondary }]}>
                    Charger: {connectorId ? connectorId.slice(0, 8) : 'N/A'} · {connectorType}
                </Text>

                {/* Progress Arc */}
                <View style={styles.arcContainer}>
                    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                        <Circle
                            cx={SIZE / 2}
                            cy={SIZE / 2}
                            r={RADIUS}
                            stroke={isDark ? COLORS.darkTertiary : '#e0e0e0'}
                            strokeWidth={STROKE}
                            fill="transparent"
                        />
                        <AnimatedCircle
                            cx={SIZE / 2}
                            cy={SIZE / 2}
                            r={RADIUS}
                            strokeWidth={STROKE}
                            fill="transparent"
                            strokeDasharray={CIRCUMFERENCE}
                            animatedProps={animProps}
                            strokeLinecap="round"
                            rotation="-90"
                            origin={`${SIZE / 2}, ${SIZE / 2}`}
                        />
                    </Svg>
                    <View style={styles.arcCenter}>
                        <Text style={[styles.chargePercent, { color: textPrimary }]}>{chargePercent}%</Text>
                        <Text style={[styles.chargeLabel, { color: textSecondary }]}>Charged</Text>
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <GlassCard style={styles.statCard as any} intensity={20}>
                        <Text style={[styles.statValue, { color: textPrimary }]}>{kwhDelivered}</Text>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>kWh</Text>
                    </GlassCard>
                    <GlassCard style={styles.statCard as any} intensity={20}>
                        <Text style={[styles.statValue, { color: textPrimary }]}>₹{estimatedCost}</Text>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>Cost So Far</Text>
                    </GlassCard>
                    <GlassCard style={styles.statCard as any} intensity={20}>
                        <Text style={[styles.statValue, { color: textPrimary }]}>{formatTime(elapsed)}</Text>
                        <Text style={[styles.statLabel, { color: textSecondary }]}>Elapsed</Text>
                    </GlassCard>
                </View>

                {/* ETA */}
                <GlassCard style={styles.etaCard as any} intensity={25}>
                    <Zap size={18} color={COLORS.brandBlue} />
                    <Text style={[styles.etaText, { color: textPrimary }]}>
                        Est. {timeRemainingMin} min remaining to full charge
                    </Text>
                </GlassCard>

                {/* Stop Button */}
                <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                    <Text style={styles.stopText}>Stop Charging</Text>
                </TouchableOpacity>

                {/* Report Issue */}
                <TouchableOpacity style={styles.reportLink} onPress={() =>
                    Alert.alert('Report Sent', 'Charger issue reported to VoltLink support.')}>
                    <AlertTriangle size={14} color={textSecondary} />
                    <Text style={[styles.reportText, { color: textSecondary }]}>Mark station as not working</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: SPACING.lg, paddingBottom: 130, alignItems: 'center' },
    sessionHeader: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', width: '100%', marginBottom: 4,
    },
    stationName: { ...TYPOGRAPHY.body, fontWeight: '700', flex: 1, marginRight: SPACING.sm },
    livePill: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 12, gap: 6,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.successGreen },
    liveText: { ...TYPOGRAPHY.label, color: COLORS.successGreen, fontWeight: '800', fontSize: 10 },
    chargerId: { ...TYPOGRAPHY.label, alignSelf: 'flex-start', marginBottom: SPACING.xl },
    arcContainer: {
        width: SIZE, height: SIZE,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    arcCenter: { position: 'absolute', alignItems: 'center' },
    chargePercent: { ...TYPOGRAPHY.hero, fontSize: 44, fontWeight: '800' },
    chargeLabel: { ...TYPOGRAPHY.label },
    statsRow: { flexDirection: 'row', width: '100%', gap: SPACING.sm, marginBottom: SPACING.md },
    statCard: { flex: 1, padding: SPACING.md, alignItems: 'center', borderRadius: BORDER_RADIUS.md },
    statValue: { ...TYPOGRAPHY.sectionHeader, fontSize: 16, fontWeight: '700' },
    statLabel: { ...TYPOGRAPHY.label, marginTop: 2, textAlign: 'center' },
    etaCard: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
        width: '100%', marginBottom: SPACING.xl,
    },
    etaText: { ...TYPOGRAPHY.body, flex: 1 },
    stopBtn: {
        width: '100%', height: 52, borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1.5, borderColor: COLORS.alertRed,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    stopText: { ...TYPOGRAPHY.body, color: COLORS.alertRed, fontWeight: '700', fontSize: 16 },
    reportLink: {
        flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: SPACING.sm,
    },
    reportText: { ...TYPOGRAPHY.label },
    ratingCenter: {
        flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg,
    },
    ratingCard: { width: '100%' },
    ratingInner: {
        padding: SPACING.xl, borderRadius: BORDER_RADIUS.xl, alignItems: 'center',
    },
    ratingTitle: { ...TYPOGRAPHY.sectionHeader, fontSize: 22, marginTop: SPACING.md },
    ratingCost: { ...TYPOGRAPHY.hero, fontSize: 32, fontWeight: '800', marginTop: SPACING.sm },
    ratingKwh: { ...TYPOGRAPHY.body, marginTop: SPACING.xs },
    ratingPrompt: { ...TYPOGRAPHY.body, marginTop: SPACING.xl, marginBottom: SPACING.md },
    starsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
    submitBtn: {
        width: '100%', height: 50, borderRadius: BORDER_RADIUS.xl,
        justifyContent: 'center', alignItems: 'center',
    },
});

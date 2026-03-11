import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Switch, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
    useSharedValue, withTiming, useAnimatedProps, withRepeat, withSequence
} from 'react-native-reanimated';
import { Zap, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { useThemeStore } from '../../store/themeStore';
import { getUserActiveSessions, stopSession, rateSession } from '../../services/session.service';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 220;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '11';
const POLL_INTERVAL = Number(process.env.EXPO_PUBLIC_SESSION_POLL_INTERVAL ?? 30000);

export default function B2CSession() {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const router = useRouter();

    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sessionEnded, setSessionEnded] = useState(false);
    const [stationRating, setStationRating] = useState(0);
    const [appRating, setAppRating] = useState(0);
    const [ratingSubmitted, setRatingSubmitted] = useState(false);

    const progress = useSharedValue(0);
    const pulseOpacity = useSharedValue(1);

    useEffect(() => {
        pulseOpacity.value = withRepeat(
            withSequence(withTiming(0.4, { duration: 900 }), withTiming(1, { duration: 900 })),
            -1,
            true
        );
    }, []);



    // Poll active session
    const fetchSession = useCallback(async () => {
        try {
            const data = await getUserActiveSessions(DEFAULT_USER_ID, 'active');
            // Endpoint returns an array — take first active session
            const active = Array.isArray(data) ? data[0] : data;
            if (active) {
                setSession(active);
                const soc = active.current_soc ?? 0;
                progress.value = withTiming(soc / 100, { duration: 1000 });
            } else if (session) {
                setSessionEnded(true);
            }
            setLoading(false);
        } catch (error: any) {
            if (error.response?.status === 404 && session) {
                setSessionEnded(true);
            }
            setLoading(false);
        }
    }, [session]);

    useFocusEffect(
        useCallback(() => {
            fetchSession();
            const timer = setInterval(fetchSession, POLL_INTERVAL);
            return () => clearInterval(timer);
        }, [fetchSession])
    );

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
    const connectorId = session?.connector_id || '';
    const chargingRate = session?.charging_rate_kw ?? 0;

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
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Are you sure you want to end this charging session?');
            if (confirmed) {
                (async () => {
                    try {
                        if (session?.id) {
                            const finalSession = await stopSession(session.id);
                            setSession(finalSession);
                        }
                        setSessionEnded(true);
                    } catch (error) {
                        console.error('Error stopping session:', error);
                        window.alert('Failed to stop session.');
                    }
                })();
            }
            return;
        }

        Alert.alert('Stop Charging?', 'Are you sure you want to end this charging session?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Stop Session', style: 'destructive', onPress: async () => {
                    try {
                        if (session?.id) {
                            const finalSession = await stopSession(session.id);
                            setSession(finalSession);
                        }
                        setSessionEnded(true);
                    } catch (error) {
                        console.error('Error stopping session:', error);
                        Alert.alert('Error', 'Failed to stop session.');
                    }
                }
            }
        ]);
    };

    const handleRatingSubmit = async () => {
        try {
            if (session?.id && (stationRating > 0 || appRating > 0)) {
                // Determine rating: 5 for Thumbs Up, 1 for Thumbs Down
                const finalRating = stationRating || appRating;

                await rateSession(session.station_id || 'unknown', {
                    session_id: session.id.toString(),
                    user_id: parseInt(DEFAULT_USER_ID),
                    rating: finalRating,
                    comment: `Station: ${stationRating === 5 ? 'Up' : 'Down'}, App: ${appRating === 5 ? 'Up' : 'Down'}`,
                });
            }
            setRatingSubmitted(true);
            setTimeout(() => router.replace('/(b2c)/dashboard'), 1500);
        } catch (error) {
            console.error('Error submitting rating:', error);
            Alert.alert('Error', 'Failed to submit feedback. Taking you to dashboard.');
            router.replace('/(b2c)/dashboard');
        }
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
                            <Text style={[styles.ratingCost, { color: COLORS.brandBlue }]}>₹{estimatedCost}</Text>
                            <Text style={[styles.ratingKwh, { color: textSecondary }]}>{kwhDelivered} kWh delivered</Text>



                            <Text style={[styles.ratingPrompt, { color: textSecondary }]}>Rate your experience</Text>

                            <View style={styles.ratingSection}>
                                <View style={styles.ratingRowCategory}>
                                    <Text style={[styles.categoryLabel, { color: textSecondary }]}>Station</Text>
                                    <View style={styles.thumbsRow}>
                                        <TouchableOpacity onPress={() => setStationRating(1)} style={[styles.thumbBtn, stationRating === 1 && { borderColor: COLORS.alertRed, backgroundColor: COLORS.alertRed + '15' }]}>
                                            <ThumbsDown size={24} color={stationRating === 1 ? COLORS.alertRed : textSecondary} fill={stationRating === 1 ? COLORS.alertRed : 'transparent'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setStationRating(5)} style={[styles.thumbBtn, stationRating === 5 && { borderColor: COLORS.successGreen, backgroundColor: COLORS.successGreen + '15' }]}>
                                            <ThumbsUp size={24} color={stationRating === 5 ? COLORS.successGreen : textSecondary} fill={stationRating === 5 ? COLORS.successGreen : 'transparent'} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.ratingRowCategory}>
                                    <Text style={[styles.categoryLabel, { color: textSecondary }]}>App</Text>
                                    <View style={styles.thumbsRow}>
                                        <TouchableOpacity onPress={() => setAppRating(1)} style={[styles.thumbBtn, appRating === 1 && { borderColor: COLORS.alertRed, backgroundColor: COLORS.alertRed + '15' }]}>
                                            <ThumbsDown size={24} color={appRating === 1 ? COLORS.alertRed : textSecondary} fill={appRating === 1 ? COLORS.alertRed : 'transparent'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setAppRating(5)} style={[styles.thumbBtn, appRating === 5 && { borderColor: COLORS.successGreen, backgroundColor: COLORS.successGreen + '15' }]}>
                                            <ThumbsUp size={24} color={appRating === 5 ? COLORS.successGreen : textSecondary} fill={appRating === 5 ? COLORS.successGreen : 'transparent'} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: (stationRating > 0 && appRating > 0) ? COLORS.brandBlue : 'rgba(255,255,255,0.1)' }]}
                                onPress={handleRatingSubmit}
                            >
                                <Text style={{ color: (stationRating > 0 && appRating > 0) ? '#000' : COLORS.textMutedDark, fontWeight: '700' }}>
                                    {(stationRating > 0 && appRating > 0) ? 'Submit Feedback' : 'Skip'}
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
                    Charger: {connectorId ? connectorId.slice(0, 8) : 'N/A'}
                </Text>

                {/* Progress Arc */}
                <View style={styles.arcContainer}>
                    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
                        <Circle
                            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                            stroke={isDark ? COLORS.darkTertiary : '#e0e0e0'}
                            strokeWidth={STROKE} fill="transparent"
                        />
                        <AnimatedCircle
                            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                            strokeWidth={STROKE} fill="transparent"
                            strokeDasharray={CIRCUMFERENCE} animatedProps={animProps}
                            strokeLinecap="round" rotation="-90"
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
                        <Text style={[styles.statLabel, { color: textSecondary }]}>Cost</Text>
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
                        Est. {timeRemainingMin} min to full charge
                    </Text>
                </GlassCard>


                {/* Stop Button */}
                <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
                    <Text style={styles.stopText}>Stop Charging</Text>
                </TouchableOpacity>

                {/* Report Issue */}
                <TouchableOpacity style={styles.reportLink} onPress={() =>
                    Alert.alert('Report Sent', 'Issue reported to VoltLink support.')}>
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
        width: '100%', marginBottom: SPACING.md,
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
    ratingPrompt: { ...TYPOGRAPHY.body, marginTop: SPACING.lg, marginBottom: SPACING.md },
    ratingSection: { width: '100%', gap: SPACING.md, marginBottom: SPACING.xl },
    ratingRowCategory: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
    categoryLabel: { ...TYPOGRAPHY.label, fontWeight: '600', fontSize: 13 },
    thumbsRow: { flexDirection: 'row', gap: SPACING.lg },
    thumbBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
    submitBtn: {
        width: '100%', height: 50, borderRadius: BORDER_RADIUS.xl,
        justifyContent: 'center', alignItems: 'center',
    },
});

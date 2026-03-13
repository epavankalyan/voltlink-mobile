import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, Text, TouchableOpacity, Modal, TextInput, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    Wallet, Leaf, Zap, ChevronRight, Plus, X, MapPin, Bot, User,
    Car, BatteryCharging, Plug, IndianRupee, CalendarCheck, CheckCircle
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { MetricCard } from '../../components/ui/MetricCard';
import { VehicleCard } from '../../components/vehicle/VehicleCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { getB2CStats } from '../../services/b2c.service';
import { getAIRecommendations } from '../../services/stations.service';
import { getStationSlots } from '../../services/session.service';
import { createBooking } from '../../services/booking.service';
import { Station } from '../../types/station.types';
import { useThemeStore } from '../../store/themeStore';
import { useVehicleStore } from '../../store/vehicleStore';
import { useRouter } from 'expo-router';
import { useLanguageStore, Language } from '../../store/languageStore';

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '11';

const translations = {
    English: {
        welcome: 'Welcome back,',
        familyVehicles: 'FAMILY VEHICLES',
        add: 'Add',
        sessions: 'Sessions',
        co2Saved: 'CO₂ Saved',
        creditsEarned: 'Credits Earned',
        availableCredits: 'Available Credits',
        viewHistory: 'View transaction history',
        findStations: 'Find Charging Stations Near You',
        addFamilyVehicle: 'Add Family Vehicle',
        familyName: 'Family Member Name',
        vehicleModel: 'Vehicle Model (e.g. Nexon EV)',
        batteryLevel: 'Current Battery %',
        cancel: 'Cancel',
        addVehicle: 'Add Vehicle',
        aiRec: 'AI RECOMMENDATIONS',
        bookNow: 'Book Now',
        available: 'Available',
        full: 'Full',
    },
    'हिंदी': {
        welcome: 'वापसी पर स्वागत है,',
        familyVehicles: 'पारिवारिक वाहन',
        add: 'जोड़ें',
        sessions: 'सत्र',
        co2Saved: 'CO₂ बचत',
        creditsEarned: 'अर्जित क्रेडिट',
        availableCredits: 'उपलब्ध क्रेडिट',
        viewHistory: 'लेन-देन का इतिहास देखें',
        findStations: 'अपने पास चार्जिंग स्टेशन खोजें',
        addFamilyVehicle: 'पारिवारिक वाहन जोड़ें',
        familyName: 'परिवार के सदस्य का नाम',
        vehicleModel: 'वाहन मॉडल (जैसे नेक्सॉन ईवी)',
        batteryLevel: 'वर्तमान बैटरी %',
        cancel: 'रद्द करें',
        addVehicle: 'वाहन जोड़ें',
        aiRec: 'AI सुझाव',
        bookNow: 'अभी बुक करें',
        available: 'उपलब्ध',
        full: 'भरा हुआ',
    }
};

const AI_STEPS = [
    { title: 'Vehicle Detected', sub: 'Reading vehicle telemetry', detail: 'Battery: 35% · Capacity: 72 kWh · Location acquired', Icon: Car },
    { title: 'Battery Analyzed', sub: 'Determining charge type', detail: 'Battery < 50% → AC Fast charging recommended', Icon: BatteryCharging },
    { title: 'Route Scanned', sub: 'Finding CPOs within 5 km', detail: '3 CPOs found on Bangalore → Chennai route', Icon: MapPin },
    { title: 'Charger Matched', sub: 'Checking slot availability', detail: 'AC Fast @ ChargeZone Hub — slot in 30 min', Icon: Plug },
    { title: 'Price Calculated', sub: 'Applying dynamic pricing', detail: '₹8.00/kWh · Off-peak discount applied (−20%)', Icon: IndianRupee },
    { title: 'Slot Booked', sub: 'Reservation confirmed', detail: 'Booked 14:30–15:30 · Est. cost ₹259.20', Icon: CalendarCheck },
    { title: 'Charging Active', sub: 'Session in progress', detail: 'Charging to 80% · ETA 47 min remaining', Icon: Zap },
];

const B2CDashboard = () => {
    const { theme } = useThemeStore();
    const { language, setLanguage } = useLanguageStore();
    const { myVehicle, currentVehicleId, setMyVehicleFromUserData } = useVehicleStore();
    const isDark = theme === 'dark';
    const router = useRouter();
    const t = translations[language];

    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [aiStations, setAiStations] = useState<Station[]>([]);

    const [simVisible, setSimVisible] = useState(false);
    const [simStation, setSimStation] = useState<Station | null>(null);
    const [simStep, setSimStep] = useState(0);
    const [simLoading, setSimLoading] = useState(false);
    const simScrollRef = useRef<ScrollView>(null);
    const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchData = async (forceRefresh: boolean = false) => {
        try {
            const sData = await getB2CStats(DEFAULT_USER_ID, forceRefresh);
            setStats(sData);

            const vehicle = sData?.vehicle ?? null;
            setMyVehicleFromUserData(vehicle);

            if (vehicle?.id) {
                try {
                    const aiData = await getAIRecommendations(vehicle.id.toString(), forceRefresh);
                    setAiStations(aiData.slice(0, 3));
                } catch (aiErr: any) {
                    console.error('[B2C] AI recommendations failed:', {
                        endpoint: `GET /vehicles/${vehicle.id}/recommendations`,
                        error: aiErr?.response?.data || aiErr?.message,
                    });
                }
            }
        } catch (error: any) {
            console.error('[B2C] Dashboard fetch failed:', {
                endpoint: `GET /users/${DEFAULT_USER_ID}`,
                error: error?.response?.data || error?.message,
            });
        }
    };

    useEffect(() => { fetchData(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData(true);
        setRefreshing(false);
    };

    useEffect(() => {
        if (simVisible && simStep > 0 && simScrollRef.current) {
            let stepY = Math.max(0, (simStep - 2) * 85);
            if (simStep === 7) stepY += 260;
            simScrollRef.current.scrollTo({ y: stepY, animated: true });
        }
    }, [simStep, simVisible]);

    const handleBookNow = async (station: Station) => {
        setSimStation(station);
        setSimStep(0);
        setSimLoading(true);
        setSimVisible(true);

        try {
            const slotsData = await getStationSlots(station.id);

            let matchedConnector: any = null;
            let firstAvailableSlot: any = null;
            for (const conn of slotsData) {
                const slot = conn.slots.find(s => s.available);
                if (slot) {
                    matchedConnector = conn;
                    firstAvailableSlot = slot;
                    break;
                }
            }

            if (!firstAvailableSlot || !matchedConnector) {
                throw new Error('No available slots at this station right now.');
            }

            let timeStr = firstAvailableSlot.time || "12:00";
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
                connector_id: matchedConnector.connector_id,
                vehicle_id: parseInt(currentVehicleId || '0', 10),
                user_id: parseInt(DEFAULT_USER_ID, 10),
                booking_time: now.toISOString(),
            });

            setSimLoading(false);
            setSimStep(1);

            let step = 2;
            simIntervalRef.current = setInterval(() => {
                setSimStep(step);
                if (step === 7) {
                    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
                    setTimeout(() => {
                        setSimVisible(false);
                        setSimStep(0);
                        router.push('/b2c/history' as any);
                    }, 2500);
                }
                step++;
            }, 1000);
        } catch (error: any) {
            console.error('AI booking error:', error);
            setSimLoading(false);
            setSimVisible(false);
            Alert.alert('Booking Failed', error.message || 'Something went wrong. Please try again.');
        }
    };

    useEffect(() => {
        return () => {
            if (simIntervalRef.current) clearInterval(simIntervalRef.current);
        };
    }, []);

    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brandBlue} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={[styles.greeting, { color: textSecondary }]}>{t.welcome}</Text>
                            <Text style={[styles.name, { color: textPrimary }]}>{stats?.user?.name || 'User'}</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <View style={styles.langSwitch}>
                                {(['English', 'हिंदी'] as Language[]).map((l) => (
                                    <TouchableOpacity
                                        key={l}
                                        onPress={() => setLanguage(l)}
                                        style={[
                                            styles.langPill,
                                            language === l && { backgroundColor: COLORS.brandBlue }
                                        ]}
                                    >
                                        <Text style={[styles.langText, { color: language === l ? '#000' : textSecondary }]}>
                                            {l}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity
                                style={[styles.profileAvatar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                                onPress={() => router.push('/b2c/profile' as any)}
                            >
                                <User size={20} color={textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Vehicle Card */}
                {myVehicle?.id ? (
                    <VehicleCard
                        vehicle={myVehicle as any}
                        onPress={() => router.push('/b2c/discover' as any)}
                    />
                ) : null}

                {/* Charging Stats */}
                <Text style={[styles.allStatsTitle, { color: textSecondary }]}>Charging Stats</Text>
                <View style={styles.statsRow}>
                    <MetricCard
                        label={t.sessions}
                        value={stats?.totalSessions || 0}
                        icon={<Zap size={16} color={COLORS.brandBlue} />}
                    />
                    <MetricCard
                        label={t.co2Saved}
                        value={Number(stats?.carbonSavedKg ?? 0).toFixed(2)}
                        unit="kg"
                        icon={<Leaf size={16} color={COLORS.successGreen} />}
                    />
                    <MetricCard
                        label={t.creditsEarned}
                        value={Number(stats?.availableCredits ?? 0).toFixed(2)}
                        icon={<Wallet size={16} color={COLORS.brandBlue} />}
                    />
                </View>


                {/* AI Recommendations Section */}
                {aiStations.length > 0 && (
                    <View style={styles.aiSection}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Bot size={14} color={COLORS.brandBlue} />
                                <Text style={[styles.familyTitle, { color: textSecondary }]}>{t.aiRec}</Text>
                            </View>
                            <TouchableOpacity onPress={() => router.push('/b2c/discover' as any)}>
                                <Text style={[styles.seeAllText, { color: COLORS.brandBlue }]}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.aiScroll}
                        >
                            {aiStations.map((station) => {
                                const ok = (station.availableChargers ?? 0) > 0;
                                const dot = ok ? COLORS.successGreen : COLORS.alertRed;
                                return (
                                    <TouchableOpacity
                                        key={station.id}
                                        activeOpacity={0.85}
                                        onPress={() => handleBookNow(station)}
                                        disabled={!ok}
                                    >
                                        <GlassCard style={styles.aiCard as any} intensity={20}>
                                            {/* Status dot + name */}
                                            <View style={styles.aiCardTop}>
                                                <View style={[styles.aiDotOuter, { backgroundColor: `${dot}20` }]}>
                                                    <View style={[styles.aiDotInner, { backgroundColor: dot }]} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.aiStationName, { color: textPrimary }]} numberOfLines={1}>
                                                        {station.name}
                                                    </Text>
                                                    <Text style={[styles.aiCpoName, { color: COLORS.brandBlue }]} numberOfLines={1}>
                                                        {station.cpoName}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Price */}
                                            <Text style={styles.aiPrice}>
                                                ₹{station.effectivePrice || station.pricePerKwh}
                                                <Text style={[styles.aiPriceUnit, { color: textSecondary }]}>/kWh</Text>
                                            </Text>

                                            {/* Meta chips */}
                                            <View style={styles.aiMeta}>
                                                <View style={[styles.aiChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                                                    <MapPin size={10} color={textSecondary} />
                                                    <Text style={[styles.aiChipText, { color: textSecondary }]}>{station.distanceKm} km</Text>
                                                </View>
                                                <View style={[styles.aiChip, { backgroundColor: `${dot}15` }]}>
                                                    <Zap size={10} color={dot} />
                                                    <Text style={[styles.aiChipText, { color: dot, fontWeight: '700' }]}>
                                                        {station.availableChargers}/{station.totalChargers} {ok ? t.available : t.full}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* AI reason badge */}
                                            {station.aiReason && (
                                                <View style={styles.aiReasonBadge}>
                                                    <Text style={styles.aiReasonText} numberOfLines={2}>🤖 {station.aiReason}</Text>
                                                </View>
                                            )}

                                            {/* Book Now */}
                                            <TouchableOpacity
                                                style={[styles.aiBookBtn, !ok && { opacity: 0.4 }]}
                                                onPress={() => handleBookNow(station)}
                                                disabled={!ok}
                                            >
                                                <Text style={styles.aiBookText}>{ok ? t.bookNow : t.full}</Text>
                                                {ok && <ChevronRight size={13} color={COLORS.brandBlue} />}
                                            </TouchableOpacity>
                                        </GlassCard>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                
            </ScrollView>

            {/* AI Simulation Modal */}
            <Modal visible={simVisible} animationType="slide" transparent={false}>
                <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
                    {simLoading ? (
                        <View style={styles.simLoadingContainer}>
                            <ActivityIndicator color={COLORS.brandBlue} size="large" />
                            <Text style={[styles.simLoadingText, { color: textSecondary }]}>
                                🤖 AI is finding the best slot for you...
                            </Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.loopHeader}>
                                <GlassCard style={styles.botBadge as any} intensity={15}>
                                    <Bot size={16} color={COLORS.brandBlue} />
                                    <Text style={[styles.botText, { color: textPrimary }]}>VoltLink AI Optimizer</Text>
                                </GlassCard>
                                <Text style={[styles.loopTitle, { color: textPrimary }]}>Processing your booking...</Text>
                            </View>

                            <ScrollView
                                ref={simScrollRef}
                                contentContainerStyle={styles.loopContent}
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={styles.timelineContainer}>
                                    {AI_STEPS.map((s, i) => {
                                        const stepIdx = i + 1;
                                        const isActive = simStep === stepIdx;
                                        const isCompleted = simStep > stepIdx;
                                        const isLast = i === AI_STEPS.length - 1;
                                        const statusColor = isCompleted ? COLORS.successGreen : isActive ? COLORS.brandBlue : textSecondary;

                                        return (
                                            <View key={i} style={styles.stepRow}>
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

                                {simStep === 7 && (
                                    <View style={[styles.successBox, { backgroundColor: isDark ? 'rgba(0,255,136,0.08)' : 'rgba(0,255,136,0.05)' }]}>
                                        <CheckCircle color={COLORS.successGreen} size={32} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.successTitle, { color: textPrimary }]}>Success!</Text>
                                            <Text style={[styles.successSub, { color: textSecondary }]}>
                                                Your booking at {simStation?.name} is confirmed.
                                            </Text>
                                            <Text style={[styles.successSub, { color: textSecondary, marginTop: 12, fontStyle: 'italic' }]}>
                                                Redirecting to history...
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        </>
                    )}
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: SPACING.lg, paddingBottom: 120 },
    header: { marginBottom: SPACING.lg, marginTop: Platform.OS === 'android' ? SPACING.md : 0 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    langSwitch: { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 4 },
    langPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
    langText: { fontSize: 10, fontWeight: '800' },
    profileAvatar: {
        width: 36, height: 36,
        borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
    },
    greeting: { ...TYPOGRAPHY.label, fontSize: 15 },
    name: { ...TYPOGRAPHY.hero, fontSize: 28 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm, marginTop: SPACING.md },
    familyTitle: {
        ...TYPOGRAPHY.label, fontWeight: '700', fontSize: 11, letterSpacing: 1.2,
    },
    familyScroll: { gap: SPACING.sm, paddingBottom: SPACING.md },
    familyCard: {
        width: 110, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center',
    },
    addVehicleCard: {
        width: 110, height: 115,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(4, 234, 170, 0.05)',
        gap: 8,
    },
    addVehicleText: {
        ...TYPOGRAPHY.label,
        fontWeight: '700',
        fontSize: 12,
    },
    familyAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,212,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 6,
    },
    familyInitial: { color: COLORS.brandBlue, fontWeight: '800', fontSize: 16 },
    familyName: { ...TYPOGRAPHY.label, fontWeight: '700', marginBottom: 2, fontSize: 12 },
    familyVehicle: { ...TYPOGRAPHY.label, fontSize: 10, marginBottom: 4, textAlign: 'center' },
    familyBattery: { ...TYPOGRAPHY.label, fontWeight: '800', fontSize: 13 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -4, marginBottom: SPACING.md, marginTop: SPACING.sm },
    creditCard: {
        backgroundColor: COLORS.brandBlue,
        padding: SPACING.lg, marginBottom: SPACING.md, borderRadius: BORDER_RADIUS.lg,
    },
    creditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
    creditInfo: { flex: 1 },
    creditLabel: { ...TYPOGRAPHY.label, color: 'rgba(255,255,255,0.8)' },
    creditValue: { ...TYPOGRAPHY.hero, color: '#FFF', fontSize: 36 },
    creditFooter: {
        flexDirection: 'row', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: SPACING.sm,
    },
    creditSubtext: { ...TYPOGRAPHY.label, color: '#FFF', marginRight: 4 },
    discoverCta: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(0,212,255,0.08)',
        borderWidth: 1, borderColor: 'rgba(0,212,255,0.25)',
        borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: SPACING.sm,
    },
    discoverText: { ...TYPOGRAPHY.body, color: COLORS.brandBlue, flex: 1, fontWeight: '600' },
    seeAllText: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 15 },
    allStatsTitle: { ...TYPOGRAPHY.sectionHeader, fontSize: 18, fontWeight: '700', marginBottom: SPACING.sm, marginTop: SPACING.sm },

    aiSection: { marginBottom: SPACING.md },
    aiScroll: { gap: SPACING.sm, paddingBottom: SPACING.sm },
    aiCard: {
        width: 200,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
    },
    aiCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs ?? 4, gap: 8 },
    aiDotOuter: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    aiDotInner: { width: 9, height: 9, borderRadius: 4.5 },
    aiStationName: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 13 },
    aiCpoName: { ...TYPOGRAPHY.label, fontWeight: '600', fontSize: 10, marginTop: 1 },
    aiPrice: { ...TYPOGRAPHY.sectionHeader, fontSize: 18, fontWeight: '800', color: COLORS.successGreen, marginBottom: 6 },
    aiPriceUnit: { fontSize: 11, fontWeight: '400' },
    aiMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
    aiChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
    aiChipText: { ...TYPOGRAPHY.label, fontSize: 10 },
    aiReasonBadge: { backgroundColor: 'rgba(0,212,255,0.08)', borderRadius: 7, padding: 5, marginBottom: 8 },
    aiReasonText: { ...TYPOGRAPHY.label, color: COLORS.brandBlue, fontSize: 10, lineHeight: 14 },
    aiBookBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 3, paddingVertical: 7,
        borderTopWidth: 1, borderTopColor: 'rgba(0,212,255,0.15)',
    },
    aiBookText: { ...TYPOGRAPHY.label, fontWeight: '800', fontSize: 12, color: COLORS.brandBlue },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.lg },
    modalContent: { padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
    modalTitle: { ...TYPOGRAPHY.sectionHeader, fontSize: 18, fontWeight: 'bold' },
    input: { height: 48, borderRadius: BORDER_RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, marginBottom: SPACING.md, ...TYPOGRAPHY.body, fontSize: 14 },
    modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },

    simLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    simLoadingText: { ...TYPOGRAPHY.body, textAlign: 'center', fontWeight: '600', marginTop: 20 },
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
});

export default B2CDashboard;

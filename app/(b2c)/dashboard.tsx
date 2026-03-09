import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, Text, TouchableOpacity, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, Leaf, Zap, ChevronRight, Map, Plus, X, MapPin, Bot } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { MetricCard } from '../../components/ui/MetricCard';
import { VehicleCard } from '../../components/vehicle/VehicleCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { getB2CStats } from '../../services/b2c.service';
import { getStations } from '../../services/stations.service';
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
        credits: 'Credits',
        co2Saved: 'CO₂ Saved',
        sessions: 'Sessions',
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
        credits: 'क्रेडिट',
        co2Saved: 'CO₂ बचत',
        sessions: 'सत्र',
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

const B2CDashboard = () => {
    const { theme } = useThemeStore();
    const { language, setLanguage } = useLanguageStore();
    const { myVehicle, familyVehicles, addFamilyVehicle, fetchMyVehicle, setCurrentVehicleId } = useVehicleStore();
    const isDark = theme === 'dark';
    const router = useRouter();
    const t = translations[language];

    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [aiStations, setAiStations] = useState<Station[]>([]);
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [newVehicle, setNewVehicle] = useState({ memberName: '', vehicleModel: '', batteryLevel: 80 });

    const fetchData = async (forceRefresh: boolean = false) => {
        try {
            const [sData, stationsData] = await Promise.all([
                getB2CStats(DEFAULT_USER_ID, forceRefresh),
                getStations(undefined, forceRefresh),
            ]);
            setStats(sData);

            // Sort: stations with aiReason first, then by distance
            const sorted = [...stationsData].sort((a, b) => {
                if (a.aiReason && !b.aiReason) return -1;
                if (!a.aiReason && b.aiReason) return 1;
                return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
            });
            setAiStations(sorted.slice(0, 3));

            // Set current vehicle ID from profile if available
            const vehicleId = sData?.user?.primary_vehicle_id || sData?.vehicles?.[0]?.id;
            if (vehicleId) {
                setCurrentVehicleId(vehicleId);
                await fetchMyVehicle(vehicleId);
            }
        } catch (error) {
            console.error('Error fetching B2C dashboard data:', error);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData(true);
        setRefreshing(false);
    };

    const handleAddVehicle = () => {
        if (!newVehicle.memberName || !newVehicle.vehicleModel) return;
        addFamilyVehicle({
            ...newVehicle,
            coordinates: { latitude: 28.495, longitude: 77.088 }
        });
        setShowAddVehicle(false);
        setNewVehicle({ memberName: '', vehicleModel: '', batteryLevel: 80 });
    };

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
                    </View>
                </View>

                {/* Vehicle Card */}
                <VehicleCard
                    vehicle={myVehicle as any}
                    onPress={() => router.push('/(b2c)/discover' as any)}
                />

                {/* Family Members Strip */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.familyTitle, { color: textSecondary }]}>{t.familyVehicles}</Text>
                    <TouchableOpacity onPress={() => setShowAddVehicle(true)}>
                        <Plus size={16} color={COLORS.primaryGreen} />
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.familyScroll}>
                    {familyVehicles.map((member) => (
                        <GlassCard key={member.id} style={styles.familyCard as any} intensity={20}>
                            <View style={styles.familyAvatar}>
                                <Text style={styles.familyInitial}>{member.memberName[0]}</Text>
                            </View>
                            <Text style={[styles.familyName, { color: textPrimary }]} numberOfLines={1}>{member.memberName}</Text>
                            <Text style={[styles.familyVehicle, { color: textSecondary }]} numberOfLines={1}>{member.vehicleModel}</Text>
                            <Text style={[styles.familyBattery, {
                                color: member.batteryLevel < 30 ? COLORS.alertRed
                                    : member.batteryLevel < 60 ? COLORS.warningOrange
                                        : COLORS.successGreen
                            }]}>
                                {member.batteryLevel}%
                            </Text>
                        </GlassCard>
                    ))}

                    {/* Add Vehicle Button Card */}
                    <TouchableOpacity onPress={() => setShowAddVehicle(true)}>
                        <View style={[styles.addVehicleCard, { borderColor: COLORS.primaryGreen + '40' }]}>
                            <Plus size={24} color={COLORS.primaryGreen} />
                            <Text style={[styles.addVehicleText, { color: COLORS.primaryGreen }]}>{t.add}</Text>
                        </View>
                    </TouchableOpacity>
                </ScrollView>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <MetricCard
                        label={t.credits}
                        value={stats?.availableCredits || 0}
                        icon={<Wallet size={16} color={COLORS.brandBlue} />}
                    />
                    <MetricCard
                        label={t.co2Saved}
                        value={`${stats?.carbonSavedKg || 0}`}
                        unit="kg"
                        icon={<Leaf size={16} color={COLORS.successGreen} />}
                    />
                    <MetricCard
                        label={t.sessions}
                        value={stats?.totalSessions || 0}
                        icon={<Zap size={16} color={COLORS.brandBlue} />}
                    />
                </View>

                {/* Credits Hero Card */}
                <TouchableOpacity onPress={() => router.push('/(b2c)/credits')}>
                    <GlassCard style={styles.creditCard as any} intensity={40}>
                        <View style={styles.creditHeader}>
                            <View style={styles.creditInfo}>
                                <Text style={styles.creditLabel}>{t.availableCredits}</Text>
                                <Text style={styles.creditValue}>{stats?.availableCredits || 0}</Text>
                            </View>
                            <Wallet color="#FFF" size={32} />
                        </View>
                        <View style={styles.creditFooter}>
                            <Text style={styles.creditSubtext}>{t.viewHistory}</Text>
                            <ChevronRight color="#FFF" size={16} />
                        </View>
                    </GlassCard>
                </TouchableOpacity>

                {/* AI Recommendations Section */}
                {aiStations.length > 0 && (
                    <View style={styles.aiSection}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Bot size={14} color={COLORS.brandBlue} />
                                <Text style={[styles.familyTitle, { color: textSecondary }]}>{t.aiRec}</Text>
                            </View>
                            <TouchableOpacity onPress={() => router.push('/(b2c)/discover' as any)}>
                                <Text style={[styles.seeAllText, { color: COLORS.brandBlue }]}>See all</Text>
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
                                        onPress={() => router.push({
                                            pathname: '/(b2c)/booking',
                                            params: { stationId: station.id, isAI: 'true' }
                                        } as any)}
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
                                                onPress={() => router.push({
                                                    pathname: '/(b2c)/booking',
                                                    params: { stationId: station.id, isAI: 'true' }
                                                } as any)}
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

                {/* Find Stations CTA */}
                <TouchableOpacity
                    style={styles.discoverCta}
                    onPress={() => router.push('/(b2c)/discover' as any)}
                    activeOpacity={0.85}
                >
                    <Map size={20} color={COLORS.brandBlue} />
                    <Text style={styles.discoverText}>{t.findStations}</Text>
                    <ChevronRight size={18} color={COLORS.brandBlue} />
                </TouchableOpacity>
            </ScrollView>

            {/* Add Family Vehicle Modal */}
            <Modal visible={showAddVehicle} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalContent} intensity={60}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>{t.addFamilyVehicle}</Text>
                            <TouchableOpacity onPress={() => setShowAddVehicle(false)}>
                                <X color={textPrimary} size={24} />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, borderColor: borderColor, color: textPrimary }]}
                            placeholder={t.familyName}
                            placeholderTextColor={textSecondary}
                            value={newVehicle.memberName}
                            onChangeText={t => setNewVehicle(p => ({ ...p, memberName: t }))}
                        />

                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, borderColor: borderColor, color: textPrimary }]}
                            placeholder={t.vehicleModel}
                            placeholderTextColor={textSecondary}
                            value={newVehicle.vehicleModel}
                            onChangeText={t => setNewVehicle(p => ({ ...p, vehicleModel: t }))}
                        />

                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, borderColor: borderColor, color: textPrimary }]}
                            placeholder={t.batteryLevel}
                            placeholderTextColor={textSecondary}
                            value={String(newVehicle.batteryLevel)}
                            keyboardType="numeric"
                            onChangeText={t => setNewVehicle(p => ({ ...p, batteryLevel: parseInt(t) || 0 }))}
                        />

                        <View style={styles.modalActions}>
                            <GlassButton title={t.cancel} variant="secondary" style={{ flex: 1 }} onPress={() => setShowAddVehicle(false)} />
                            <GlassButton title={t.addVehicle} style={{ flex: 2 }} onPress={handleAddVehicle} />
                        </View>
                    </GlassCard>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: SPACING.lg, paddingBottom: 120 },
    header: { marginBottom: SPACING.lg, marginTop: Platform.OS === 'android' ? SPACING.md : 0 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    langSwitch: { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 4 },
    langPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
    langText: { fontSize: 10, fontWeight: '800' },
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
    seeAllText: { ...TYPOGRAPHY.label, fontWeight: '700', fontSize: 12 },

    // AI Recommendations
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
    modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm }
});

export default B2CDashboard;

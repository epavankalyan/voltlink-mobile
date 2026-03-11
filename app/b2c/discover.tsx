import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView,
    Platform, Dimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { Search, MapPin, Zap, Clock, ChevronRight, Star, AlertCircle, Car, Menu, SlidersHorizontal, User } from 'lucide-react-native';
import MapComponent from '../../components/map/MapComponent';
import { FilterContent, FilterState } from '../../components/filters/FilterContent';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import RatingModal from '../../components/feedback/RatingModal';
import { rateSession } from '../../services/session.service';
import ReportIssueModal from '../../components/feedback/ReportIssueModal';
import { useThemeStore } from '../../store/themeStore';
import { useVehicleStore } from '../../store/vehicleStore';
import { getStations } from '../../services/stations.service';
import { Station } from '../../types/station.types';
import { useLanguageStore } from '../../store/languageStore';

const T = {
    English: {
        title: 'Find Stations', nearYou: 'near you',
        placeholder: 'Search stations or CPO…',
        available: 'Available', full: 'Full',
        rate: 'Rate', report: 'Report', bookNow: 'Book Now',
        noMatch: 'No stations match your search',
    },
    'हिंदी': {
        title: 'स्टेशन खोजें', nearYou: 'आपके पास',
        placeholder: 'स्टेशन या CPO खोजें…',
        available: 'उपलब्ध', full: 'भरा हुआ',
        rate: 'रेट', report: 'रिपोर्ट', bookNow: 'अभी बुक करें',
        noMatch: 'कोई स्टेशन नहीं मिला',
    },
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// TOP_INSET: space to reserve at top for safe area + "Find Stations" title.
const TOP_INSET = Platform.OS === 'ios' ? 120 : 90;

const SEARCH_BAR_HEIGHT = 80; // handle(24) + search bar(48) + margins(8)
const TAB_BAR_HEIGHT = 100;   // bottom:30 + height:70 (hardcoded in TabBar.tsx)

export default function DiscoverScreen() {
    const { theme } = useThemeStore();
    const { language } = useLanguageStore();
    const { familyVehicles, fetchFamilyVehicles } = useVehicleStore();
    const insets = useSafeAreaInsets();
    const isDark = theme === 'dark';
    const router = useRouter();
    const t = T[language as keyof typeof T] || T.English;

    // ── Dynamic snap points (device-safe) ────────────────────────────────────
    // Min: tab bar (100px hardcoded in TabBar.tsx) + bottom safe area inset + filters height
    const minSnap = TAB_BAR_HEIGHT + insets.bottom + 60;
    // Max: leave room for safe area top + "Find Stations" title
    const maxSnap = SCREEN_HEIGHT - TOP_INSET - insets.top;
    const snapPoints = useMemo(
        () => [minSnap, '55%', maxSnap] as (string | number)[],
        [minSnap, maxSnap]
    );

    const [query, setQuery] = useState('');
    const [stations, setStations] = useState<Station[]>([]);
    const [selectedStation, setSelectedStation] = useState<any>(null);
    const [showRating, setShowRating] = useState(false);
    const [showReport, setShowReport] = useState(false);

    // Filters State
    const [showFilters, setShowFilters] = useState(false);
    const [activeFilters, setActiveFilters] = useState<FilterState>({
        availableOnly: false,
        connectors: [],
        powerRatings: [],
        cpos: []
    });

    const sheetRef = useRef<BottomSheet>(null);

    const fetchData = async (forceRefresh: boolean = false) => {
        Promise.all([getStations(undefined, forceRefresh), fetchFamilyVehicles()])
            .then(([s]) => setStations(s))
            .catch(console.error);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        fetchData(true);
    };

    const surfaceBg = isDark ? '#1C1C1E' : '#FFFFFF';
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
    const inputBg = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)';

    const filtered = stations.filter(s => {
        const q = query.toLowerCase();
        const matchQ = !q || s.name?.toLowerCase().includes(q) || s.cpoName?.toLowerCase().includes(q);

        let matchF = true;

        // Status Filter
        if (activeFilters.availableOnly && (s.availableChargers ?? 0) <= 0) matchF = false;

        // Brand/CPO filter
        if (matchF && activeFilters.cpos.length > 0) {
            matchF = activeFilters.cpos.includes(s.cpoName || '');
        }

        // Connector Types filter
        if (matchF && activeFilters.connectors.length > 0) {
            const hasConn = s.chargerTypes.some(t => activeFilters.connectors.includes(t as string));
            if (!hasConn) matchF = false;
        }

        // Power Rating Filter (AC / DC)
        if (matchF && activeFilters.powerRatings.length > 0) {
            const isAC = s.chargerTypes.some(t => t.includes('Type 2') || t.includes('AC'));
            const isDC = s.chargerTypes.some(t => t.includes('CCS') || t.includes('CHAdeMO') || t.includes('DC'));

            if (activeFilters.powerRatings.includes('AC') && !isAC && !activeFilters.powerRatings.includes('DC Fast')) matchF = false;
            else if (activeFilters.powerRatings.includes('DC Fast') && !isDC && !activeFilters.powerRatings.includes('AC')) matchF = false;
        }

        return matchQ && matchF;
    });

    const renderStation = ({ item }: { item: Station }) => {
        const ok = (item.availableChargers ?? 0) > 0;
        const dot = ok ? COLORS.successGreen : COLORS.alertRed;

        return (
            <View style={[styles.card, { backgroundColor: surfaceBg, borderColor }]}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/b2c/booking' as any)}>
                    <View style={styles.cardTop}>
                        <View style={styles.nameRow}>
                            <View style={[styles.dotOuter, { backgroundColor: `${dot}20` }]}>
                                <View style={[styles.dotInner, { backgroundColor: dot }]} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.stationName, { color: textPrimary }]} numberOfLines={1}>{item.name}</Text>
                                <Text style={[styles.cpoName, { color: COLORS.brandBlue }]}>{item.cpoName}</Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.price}>₹{item.effectivePrice || item.pricePerKwh}</Text>
                            <Text style={[styles.priceUnit, { color: textSecondary }]}>/kWh</Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={[styles.chip, { backgroundColor: inputBg }]}>
                            <MapPin size={12} color={textSecondary} />
                            <Text style={[styles.chipText, { color: textSecondary }]}>{item.distanceKm} km</Text>
                        </View>
                        <View style={[styles.chip, { backgroundColor: inputBg }]}>
                            <Clock size={12} color={textSecondary} />
                            <Text style={[styles.chipText, { color: textSecondary }]}>{item.etaMinutes} min</Text>
                        </View>
                        <View style={[styles.chip, { backgroundColor: `${dot}15` }]}>
                            <Zap size={12} color={dot} />
                            <Text style={[styles.chipText, { color: dot, fontWeight: '700' }]}>
                                {item.availableChargers}/{item.totalChargers} {ok ? t.available : t.full}
                            </Text>
                        </View>
                    </View>

                    {item.aiReason && (
                        <View style={[styles.aiBadge, { backgroundColor: 'rgba(0,212,255,0.08)' }]}>
                            <Text style={styles.aiText}>🤖 {item.aiReason}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={[styles.actionRow, { borderTopColor: borderColor }]}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedStation(item); setShowRating(true); }}>
                        <Star size={14} color={textSecondary} />
                        <Text style={[styles.actionText, { color: textSecondary }]}>{t.rate}</Text>
                    </TouchableOpacity>
                    <View style={[styles.sep, { backgroundColor: borderColor }]} />
                    <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedStation(item); setShowReport(true); }}>
                        <AlertCircle size={14} color={COLORS.alertRed} />
                        <Text style={[styles.actionText, { color: COLORS.alertRed }]}>{t.report}</Text>
                    </TouchableOpacity>
                    <View style={[styles.sep, { backgroundColor: borderColor }]} />
                    <TouchableOpacity
                        style={[styles.actionBtn, { flex: 1.6 }, !ok && { opacity: 0.45 }]}
                        onPress={() => router.push('/b2c/booking' as any)}
                        disabled={!ok}
                    >
                        <Text style={[styles.actionText, { color: COLORS.brandBlue, fontWeight: '800', fontSize: 13 }]}>
                            {ok ? t.bookNow : t.full}
                        </Text>
                        {ok && <ChevronRight size={14} color={COLORS.brandBlue} />}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.root}>
            {/* ── Full-screen map ── */}
            <MapComponent
                isDark={isDark}
                stations={filtered}
                familyVehicles={familyVehicles}
                t={t}
                COLORS={COLORS}
                darkMapStyle={darkMapStyle}
                markerContainerStyle={styles.markerContainer}
                MarkerZapIcon={<Zap size={14} color="#000" />}
                MarkerCarIcon={<Car size={14} color="#FFF" />}
            />

            {/* ── Google Maps Style Search Bar Overlay ── */}
            <SafeAreaView style={styles.searchOverlay} edges={['top']} pointerEvents="box-none">
                <View style={[styles.mainSearchBar, { backgroundColor: surfaceBg, borderColor: borderColor }]}>
                    <TouchableOpacity style={styles.menuIcon} onPress={() => router.back()}>
                        <ChevronRight size={24} color={textPrimary} style={{ transform: [{ rotate: '180deg' }] }} />
                    </TouchableOpacity>
                    <TextInput
                        placeholder={t.placeholder}
                        placeholderTextColor={textSecondary}
                        value={query}
                        onChangeText={setQuery}
                        style={[styles.mainSearchInput, { color: textPrimary }]}
                        autoFocus={false}
                    />
                    <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: showFilters ? COLORS.brandBlue + '20' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'), marginRight: SPACING.xs, borderColor: showFilters ? COLORS.brandBlue : 'transparent', borderWidth: showFilters ? 1 : 0 }]}
                        onPress={() => {
                            setShowFilters(!showFilters);
                            if (!showFilters) sheetRef.current?.snapToIndex(2); // Expand when opening filters
                        }}
                    >
                        <SlidersHorizontal size={18} color={showFilters ? COLORS.brandBlue : textPrimary} />
                    </TouchableOpacity>

                </View>
            </SafeAreaView>

            {/* ── Bottom sheet — NEVER goes below tab bar ── */}
            <BottomSheet
                ref={sheetRef}
                index={1}                          // default: mid (55%)
                snapPoints={snapPoints}
                enablePanDownToClose={false}       // never goes below MIN_SNAP
                topInset={TOP_INSET}               // never covers the title at the top
                backgroundStyle={[styles.sheetBg, { backgroundColor: surfaceBg }]}
                handleIndicatorStyle={styles.indicator}
            >
                {showFilters ? (
                    <FilterContent
                        currentFilters={activeFilters}
                        stations={stations}
                        onClose={() => setShowFilters(false)}
                        onApply={(opts) => {
                            setActiveFilters(opts);
                            setShowFilters(false);
                        }}
                    />
                ) : (
                    <BottomSheetFlatList
                        data={filtered}
                        keyExtractor={(s: Station) => s.id}
                        renderItem={renderStation}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        onRefresh={onRefresh}
                        refreshing={false}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Zap size={36} color={COLORS.textMutedDark} />
                                <Text style={[styles.emptyText, { color: textSecondary }]}>{t.noMatch}</Text>
                            </View>
                        }
                    />
                )}
            </BottomSheet>

            <RatingModal
                visible={showRating}
                onClose={() => setShowRating(false)}
                onSubmit={async (sRating, aRating, comment) => {
                    try {
                        if (selectedStation?.id) {
                            await rateSession(selectedStation.id.toString(), {
                                session_id: "0", // No session context in discovery, using placeholder
                                user_id: 11, // Default user
                                rating: sRating || aRating,
                                comment: comment || `Discovery Rating: App ${aRating}, Station ${sRating}`,
                            });
                        }
                        setShowRating(false);
                        Alert.alert('Thanks!', 'Your feedback has been received.');
                    } catch (error) {
                        console.error('Error submitting rating:', error);
                        setShowRating(false);
                        Alert.alert('Error', 'Failed to submit feedback.');
                    }
                }}
                stationName={selectedStation?.name || ''}
            />
            <ReportIssueModal
                visible={showReport}
                onClose={() => setShowReport(false)}
                onSubmit={() => { setShowReport(false); Alert.alert('Reported', 'Team notified.'); }}
                stationName={selectedStation?.name || ''}
            />
        </View>
    );
}

const darkMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];

const styles = StyleSheet.create({
    root: { flex: 1 },
    markerContainer: { padding: 6, borderRadius: 12, borderWidth: 2, borderColor: '#000' },

    // Search Overlay
    searchOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 10,
        paddingHorizontal: SPACING.lg,
        paddingTop: Platform.OS === 'ios' ? 4 : SPACING.md,
    },
    mainSearchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        borderRadius: 26,
        paddingHorizontal: SPACING.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: StyleSheet.hairlineWidth,
    },
    menuIcon: { marginRight: SPACING.sm },
    mainSearchInput: { flex: 1, ...TYPOGRAPHY.body, fontSize: 16 },
    iconBtn: {
        width: 32, height: 32,
        borderRadius: 16,
        justifyContent: 'center', alignItems: 'center',
        marginLeft: SPACING.sm
    },

    // Sheet
    sheetBg: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
    indicator: { backgroundColor: '#C0C0C4', width: 38, height: 4 },


    divider: { height: StyleSheet.hairlineWidth, marginBottom: 4 },

    // List
    listContent: { paddingTop: SPACING.sm, paddingBottom: 120 },

    // Card
    card: {
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 2,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: SPACING.md,
        paddingBottom: SPACING.sm,
    },
    nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: SPACING.sm },
    dotOuter: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    dotInner: { width: 10, height: 10, borderRadius: 5 },
    stationName: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 15 },
    cpoName: { ...TYPOGRAPHY.label, fontWeight: '600', marginTop: 2 },
    price: { ...TYPOGRAPHY.sectionHeader, fontSize: 20, fontWeight: '800', color: COLORS.successGreen },
    priceUnit: { ...TYPOGRAPHY.label, fontSize: 11 },
    metaRow: {
        flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap',
        paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
    },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    chipText: { ...TYPOGRAPHY.label, fontSize: 12 },
    aiBadge: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, padding: 6, borderRadius: 8 },
    aiText: { ...TYPOGRAPHY.label, color: COLORS.brandBlue, fontSize: 11 },
    actionRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 13 },
    actionText: { ...TYPOGRAPHY.label, fontWeight: '700', fontSize: 12 },
    sep: { width: StyleSheet.hairlineWidth, height: 18 },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { ...TYPOGRAPHY.body },
});

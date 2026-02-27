import React, { useState } from 'react';
import {
    StyleSheet, View, Text, TouchableOpacity, FlatList, TextInput, Platform, Dimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin, Zap, Clock, ChevronRight, Star, AlertCircle, Car } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import RatingModal from '../../components/feedback/RatingModal';
import ReportIssueModal from '../../components/feedback/ReportIssueModal';
import { useThemeStore } from '../../store/themeStore';
import { useVehicleStore, INITIAL_FAMILY } from '../../store/vehicleStore';
import { MOCK_STATIONS } from '../../mock/stations.mock';
import { useLanguageStore } from '../../store/languageStore';

const translations = {
    English: {
        title: 'Find Stations',
        nearYou: 'near you',
        searchPlaceholder: 'Search stations or CPO…',
        available: 'Available',
        full: 'Full',
        rate: 'Rate',
        report: 'Report',
        bookNow: 'Book Now',
        noMatch: 'No stations match your search',
        vehicle: 'Vehicle'
    },
    'हिंदी': {
        title: 'स्टेशन खोजें',
        nearYou: 'आपके पास',
        searchPlaceholder: 'स्टेशन या CPO खोजें…',
        available: 'उपलब्ध',
        full: 'भरा हुआ',
        rate: 'रेट',
        report: 'रिपोर्ट',
        bookNow: 'अभी बुक करें',
        noMatch: 'आपकी खोज से कोई स्टेशन मेल नहीं खाता',
        vehicle: 'वाहन'
    }
};

const { width } = Dimensions.get('window');

const FILTERS = ['All', 'AC', 'DC', 'Available Now'];

export default function DiscoverScreen() {
    const { theme } = useThemeStore();
    const { language } = useLanguageStore();
    const { familyVehicles } = useVehicleStore();
    const isDark = theme === 'dark';
    const router = useRouter();
    const t = translations[language];

    const [activeFilter, setActiveFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStation, setSelectedStation] = useState<any>(null);
    const [showRating, setShowRating] = useState(false);
    const [showReport, setShowReport] = useState(false);

    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    const filtered = MOCK_STATIONS.filter(s => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || s.name.toLowerCase().includes(q) || s.cpoName.toLowerCase().includes(q);
        const matchFilter =
            activeFilter === 'All' ? true
                : activeFilter === 'Available Now' ? (s.availableChargers ?? 0) > 0
                    : activeFilter === 'AC' ? s.chargerTypes.includes('Type 2' as any)
                        : s.chargerTypes.some(t => t === 'CCS2' || t === 'CHAdeMO');
        return matchSearch && matchFilter;
    });

    const handleRating = (rating: number, comment: string) => {
        setShowRating(false);
        Alert.alert('Success', `Thank you for rating ${selectedStation?.name}!`);
    };

    const handleReport = (issueType: string, description: string) => {
        setShowReport(false);
        Alert.alert('Report Received', 'Our team has been notified. Thank you for helping the community.');
    };

    const renderStation = ({ item }: { item: typeof MOCK_STATIONS[0] }) => {
        const isAvailable = (item.availableChargers ?? 0) > 0;
        const statusColor = isAvailable ? COLORS.successGreen : COLORS.alertRed;

        return (
            <GlassCard style={[styles.card, { borderColor }] as any} intensity={20}>
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => router.push('/(b2c)/booking' as any)}
                >
                    <View style={styles.cardTop}>
                        <View style={styles.nameRow}>
                            <View style={[styles.statusDot, { backgroundColor: `${statusColor}20` }]}>
                                <View style={[styles.statusDotInner, { backgroundColor: statusColor }]} />
                            </View>
                            <View style={styles.nameBlock}>
                                <Text style={[styles.stationName, { color: textPrimary }]} numberOfLines={1}>
                                    {item.name}
                                </Text>
                                <Text style={[styles.cpoName, { color: COLORS.brandBlue }]}>{item.cpoName}</Text>
                            </View>
                        </View>

                        <View style={styles.priceBlock}>
                            <Text style={styles.price}>₹{item.effectivePrice || item.pricePerKwh}</Text>
                            <Text style={[styles.priceUnit, { color: textSecondary }]}>/kWh</Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <MapPin size={13} color={textSecondary} />
                            <Text style={[styles.metaText, { color: textSecondary }]}>{item.distanceKm} km</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Clock size={13} color={textSecondary} />
                            <Text style={[styles.metaText, { color: textSecondary }]}>{item.etaMinutes} min</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Zap size={13} color={statusColor} />
                            <Text style={[styles.metaText, { color: statusColor, fontWeight: '700' }]}>
                                {item.availableChargers}/{item.totalChargers} {isAvailable ? t.available : t.full}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.aiBadge}>
                        <Text style={styles.aiText}>🤖 {item.aiReason}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor }]}
                        onPress={() => {
                            setSelectedStation(item);
                            setShowRating(true);
                        }}
                    >
                        <Star size={14} color={textSecondary} />
                        <Text style={[styles.actionBtnText, { color: textSecondary }]}>{t.rate}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { borderColor }]}
                        onPress={() => {
                            setSelectedStation(item);
                            setShowReport(true);
                        }}
                    >
                        <AlertCircle size={14} color={COLORS.alertRed} />
                        <Text style={[styles.actionBtnText, { color: COLORS.alertRed }]}>{t.report}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.bookBtn, { opacity: !isAvailable ? 0.6 : 1 }]}
                        onPress={() => router.push('/(b2c)/booking' as any)}
                        disabled={!isAvailable}
                    >
                        <Text style={styles.bookBtnText}>{!isAvailable ? t.full : t.bookNow}</Text>
                        {isAvailable && <ChevronRight size={14} color="#000" />}
                    </TouchableOpacity>
                </View>
            </GlassCard>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: textPrimary }]}>{t.title}</Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>{filtered.length} {t.nearYou}</Text>
            </View>

            <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderColor }]}>
                <Search size={16} color={textSecondary} />
                <TextInput
                    placeholder={t.searchPlaceholder}
                    placeholderTextColor={isDark ? COLORS.textMutedDark : 'rgba(0,0,0,0.35)'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={[styles.searchInput, { color: textPrimary }]}
                />
            </View>

            <FlatList
                data={filtered}
                keyExtractor={s => s.id}
                ListHeaderComponent={() => (
                    <>
                        {/* Map View Section */}
                        <View style={[styles.mapContainer, { borderColor }]}>
                            <MapView
                                provider={PROVIDER_DEFAULT}
                                style={styles.map}
                                initialRegion={{
                                    latitude: 28.495,
                                    longitude: 77.088,
                                    latitudeDelta: 0.05,
                                    longitudeDelta: 0.05,
                                }}
                                customMapStyle={isDark ? darkMapStyle : []}
                            >
                                {MOCK_STATIONS.map((station) => {
                                    const coords = station.coordinates || { latitude: 28.495, longitude: 77.088 };
                                    return (
                                        <Marker
                                            key={`stat-${station.id}`}
                                            coordinate={{
                                                latitude: Number(coords.latitude),
                                                longitude: Number(coords.longitude)
                                            }}
                                            title={station.name}
                                            description={`${station.availableChargers}/${station.totalChargers} ${t.available}`}
                                        >
                                            <View style={[styles.markerContainer, { backgroundColor: COLORS.successGreen }]}>
                                                <Zap size={14} color="#000" />
                                            </View>
                                        </Marker>
                                    );
                                })}

                                {familyVehicles.map((vehicle, idx) => {
                                    const coords = vehicle.coordinates || INITIAL_FAMILY[idx]?.coordinates || { latitude: 28.495, longitude: 77.088 };
                                    return (
                                        <Marker
                                            key={`veh-${vehicle.id}`}
                                            coordinate={{
                                                latitude: Number(coords.latitude),
                                                longitude: Number(coords.longitude)
                                            }}
                                            title={vehicle.memberName}
                                            description={`${vehicle.vehicleModel} • ${vehicle.batteryLevel}%`}
                                        >
                                            <View style={[styles.markerContainer, { backgroundColor: COLORS.brandBlue }]}>
                                                <Car size={14} color="#FFF" />
                                            </View>
                                        </Marker>
                                    );
                                })}
                            </MapView>
                        </View>

                        <View style={styles.filterRow}>
                            {FILTERS.map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[
                                        styles.filterPill,
                                        { borderColor },
                                        activeFilter === f && { backgroundColor: COLORS.primaryGreen, borderColor: COLORS.primaryGreen }
                                    ]}
                                    onPress={() => setActiveFilter(f)}
                                >
                                    <Text style={[styles.filterText, { color: activeFilter === f ? '#000' : textSecondary }]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={renderStation}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Zap size={40} color={COLORS.textMutedDark} />
                        <Text style={[styles.emptyText, { color: textSecondary }]}>{t.noMatch}</Text>
                    </View>
                }
            />

            <RatingModal
                visible={showRating}
                onClose={() => setShowRating(false)}
                onSubmit={handleRating}
                stationName={selectedStation?.name || ''}
            />

            <ReportIssueModal
                visible={showReport}
                onClose={() => setShowReport(false)}
                onSubmit={handleReport}
                stationName={selectedStation?.name || ''}
            />
        </SafeAreaView>
    );
}

const darkMapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
    { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
];

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    },
    title: { ...TYPOGRAPHY.hero, fontSize: 26 },
    subtitle: { ...TYPOGRAPHY.label, fontSize: 13 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
        paddingHorizontal: SPACING.md, height: 46,
        borderRadius: BORDER_RADIUS.lg, borderWidth: 1,
    },
    searchInput: { flex: 1, ...TYPOGRAPHY.body, paddingVertical: 0, fontSize: 14 },
    mapContainer: {
        height: 200,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1,
        overflow: 'hidden',
    },
    map: { ...StyleSheet.absoluteFillObject },
    markerContainer: {
        padding: 6,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#000',
    },
    filterRow: {
        flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.md,
    },
    filterPill: {
        paddingHorizontal: SPACING.md, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1,
    },
    filterText: { ...TYPOGRAPHY.label, fontWeight: '600', fontSize: 12 },
    listContent: { paddingBottom: 120 },
    card: { marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.md },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.sm },
    nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: SPACING.sm },
    statusDot: {
        width: 32, height: 32, borderRadius: 16,
        justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm,
    },
    statusDotInner: { width: 10, height: 10, borderRadius: 5 },
    nameBlock: { flex: 1 },
    stationName: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 15 },
    cpoName: { ...TYPOGRAPHY.label, fontWeight: '600', marginTop: 2 },
    priceBlock: { alignItems: 'flex-end' },
    price: { ...TYPOGRAPHY.sectionHeader, fontSize: 20, fontWeight: '800', color: COLORS.successGreen },
    priceUnit: { ...TYPOGRAPHY.label, fontSize: 11 },
    metaRow: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.md },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { ...TYPOGRAPHY.label, fontSize: 12 },
    aiBadge: {
        backgroundColor: 'rgba(0,212,255,0.08)',
        paddingHorizontal: SPACING.sm, paddingVertical: 5,
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.md,
    },
    aiText: { ...TYPOGRAPHY.label, color: COLORS.brandBlue, fontSize: 11 },
    actionRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
    },
    actionBtnText: {
        ...TYPOGRAPHY.label,
        fontWeight: '700',
        fontSize: 12,
    },
    bookBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: COLORS.primaryGreen,
        paddingHorizontal: SPACING.md,
        paddingVertical: 8,
        borderRadius: BORDER_RADIUS.md,
    },
    bookBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { ...TYPOGRAPHY.body },
});

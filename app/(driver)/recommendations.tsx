import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Filter } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { RecommendationCard } from '../../components/charging/RecommendationCard';
import { GlassCard } from '../../components/ui/GlassCard';
import { useThemeStore } from '../../store/themeStore';
import { getAIRecommendations } from '../../services/stations.service'; // Added
import { Station } from '../../types/station.types'; // Added
import { useVehicleStore } from '../../store/vehicleStore';
import { useRouter, useLocalSearchParams } from 'expo-router';
import RatingModal from '../../components/feedback/RatingModal';
import { rateSession } from '../../services/session.service';
import ReportIssueModal from '../../components/feedback/ReportIssueModal';
import { Alert } from 'react-native';

const FILTERS = ['All', 'AC', 'DC', 'Swap'];

export default function RecommendationsScreen() {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const router = useRouter();
    const [activeFilter, setActiveFilter] = useState('All');
    const [selectedStation, setSelectedStation] = useState<any>(null);
    const [showRating, setShowRating] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);

    const { currentVehicleId } = useVehicleStore();

    useEffect(() => {
        if (!currentVehicleId) return;
        setLoading(true);
        getAIRecommendations(currentVehicleId)
            .then(setStations)
            .catch(err => console.error('Error fetching recommendations:', err))
            .finally(() => setLoading(false));
    }, [currentVehicleId]);

    const onRefresh = () => {
        if (!currentVehicleId) return;
        setLoading(true);
        getAIRecommendations(currentVehicleId)
            .then(setStations)
            .finally(() => setLoading(false));
    };

    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;

    const handleRating = async (sRating: number, aRating: number, comment: string) => {
        try {
            if (selectedStation?.id) {
                await rateSession(selectedStation.id.toString(), {
                    session_id: "0",
                    user_id: 11, // Default user
                    rating: sRating || aRating,
                    comment: comment || `AI Recommendation Rating: App ${aRating}, Station ${sRating}`,
                });
            }
            setShowRating(false);
            Alert.alert('Thank You', 'Your feedback has been submitted.');
        } catch (error) {
            console.error('Error submitting rating:', error);
            setShowRating(false);
            Alert.alert('Error', 'Failed to submit feedback.');
        }
    };

    const handleReport = (type: string, desc: string) => {
        setShowReport(false);
        Alert.alert('Reported', `Issue for ${selectedStation?.name} reported to management.`);
    };

    // Dynamic "Charge Now vs Wait" data from recommendations
    const firstStation = stations[0] as any;
    const chargeNowCost = firstStation ? Math.round((firstStation.pricePerKwh || 9.5) * 30) : 284;
    const waitCost = firstStation ? Math.round(firstStation.effectivePrice * 30) : 210; // 30kWh charge
    const savings = chargeNowCost - waitCost;
    const waitTime = firstStation?.nextAvailableMinutes || 60;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
            <FlatList
                data={stations}
                keyExtractor={(item) => item.id}
                refreshing={loading}
                onRefresh={() => {
                    if (!currentVehicleId) return;
                    setLoading(true);
                    getAIRecommendations(currentVehicleId)
                        .then(setStations)
                        .finally(() => setLoading(false));
                }}
                renderItem={({ item, index }) => (
                    <RecommendationCard
                        recommendation={item}
                        rank={index + 1}
                        isPrimary={index === 0}
                        onBook={() => router.push(`/(driver)/booking?rank=${index + 1}` as any)}
                        onRate={() => {
                            setSelectedStation(item);
                            setShowRating(true);
                        }}
                        onReport={() => {
                            setSelectedStation(item);
                            setShowReport(true);
                        }}
                    />
                )}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <>
                        {/* Title */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: textPrimary }]}>AI Recommendations</Text>
                        </View>

                        {/* Charge Now vs Wait */}
                        <GlassCard style={styles.comparisonCard as any} intensity={25}>
                            <Text style={[styles.compLabel, { color: textSecondary }]}>Charge Now vs Wait {waitTime} min</Text>
                            <View style={styles.compRow}>
                                <View style={styles.compCol}>
                                    <Text style={[styles.compTitle, { color: textSecondary }]}>Charge Now</Text>
                                    <Text style={[styles.compValue, { color: textPrimary }]}>₹{chargeNowCost}</Text>
                                </View>
                                <View style={styles.compDivider} />
                                <View style={styles.compCol}>
                                    <Text style={[styles.compTitle, { color: textSecondary }]}>Wait {waitTime} min</Text>
                                    <Text style={[styles.compValue, { color: COLORS.successGreen }]}>₹{waitCost}</Text>
                                </View>
                            </View>
                            <Text style={[styles.compNote, { color: textSecondary }]}>
                                ⚡ Waiting saves ₹{savings} but delays your next trip by ~{waitTime} min
                            </Text>
                        </GlassCard>

                        {/* Filter Pills */}
                        <View style={styles.filterRow}>
                            {FILTERS.map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[
                                        styles.filterPill,
                                        activeFilter === f && { backgroundColor: COLORS.brandBlue }
                                    ]}
                                    onPress={() => setActiveFilter(f)}
                                >
                                    <Text style={[styles.filterText, { color: activeFilter === f ? '#000' : textSecondary }]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, marginBottom: SPACING.md },
    title: { ...TYPOGRAPHY.hero, fontSize: 26 },
    comparisonCard: {
        marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
        padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg,
    },
    compLabel: { ...TYPOGRAPHY.label, fontWeight: '700', marginBottom: SPACING.md },
    compRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
    compCol: { flex: 1, alignItems: 'center' },
    compTitle: { ...TYPOGRAPHY.label },
    compValue: { ...TYPOGRAPHY.hero, fontSize: 28, fontWeight: '800', marginTop: 4 },
    compDivider: { width: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.12)' },
    compNote: { ...TYPOGRAPHY.label, lineHeight: 18 },
    filterRow: {
        flexDirection: 'row', paddingHorizontal: SPACING.lg,
        gap: SPACING.sm, marginBottom: SPACING.md,
    },
    filterPill: {
        paddingHorizontal: SPACING.md, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    filterText: { ...TYPOGRAPHY.label, fontWeight: '600', fontSize: 13 },
    listContent: { paddingHorizontal: SPACING.md, paddingBottom: 120 },
});

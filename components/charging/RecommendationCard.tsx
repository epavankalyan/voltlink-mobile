import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../ui/GlassCard';
import { Station } from '../../types/station.types';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';

const translations = {
    English: {
        available: 'Available',
        ai: 'AI:',
        rate: 'Rate',
        report: 'Report',
        bookNow: 'Book Now'
    },
    'हिंदी': {
        available: 'उपलब्ध',
        ai: 'AI:',
        rate: 'रेट',
        report: 'रिपोर्ट',
        bookNow: 'अभी बुक करें'
    }
};

interface RecommendationCardProps {
    recommendation: Station;
    rank: number;
    onBook: () => void;
    onRate?: () => void;
    onReport?: () => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
    recommendation,
    rank,
    onBook,
    onRate,
    onReport
}) => {
    const { theme } = useThemeStore();
    const { language } = useLanguageStore();
    const isDark = theme === 'dark';
    const t = translations[language];
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

    return (
        <GlassCard style={styles.card as any} intensity={25}>
            <View style={styles.header}>
                <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{rank}</Text>
                </View>
                <Text style={styles.price}>₹{recommendation.effectivePrice || recommendation.pricePerKwh}/kWh</Text>
            </View>

            <Text style={[styles.name, { color: textPrimary }]}>{recommendation.name}</Text>

            <View style={styles.details}>
                <Text style={[styles.detailText, { color: textSecondary }]}>
                    {recommendation.distanceKm} km • {recommendation.etaMinutes} mins
                </Text>
                <Text style={styles.availability}>
                    {recommendation.availableChargers || 0}/{recommendation.totalChargers || 0} {t.available}
                </Text>
            </View>

            <View style={styles.aiBadge}>
                <Text style={styles.aiText}>{t.ai} {recommendation.aiReason}</Text>
            </View>

            <View style={styles.actionRow}>
                {onRate && (
                    <TouchableOpacity style={[styles.actionBtn, { borderColor }]} onPress={onRate}>
                        <Text style={[styles.actionText, { color: textSecondary }]}>{t.rate}</Text>
                    </TouchableOpacity>
                )}
                {onReport && (
                    <TouchableOpacity style={[styles.actionBtn, { borderColor }]} onPress={onReport}>
                        <Text style={[styles.actionText, { color: COLORS.alertRed }]}>{t.report}</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.bookButton} onPress={onBook}>
                    <Text style={styles.bookText}>{t.bookNow}</Text>
                </TouchableOpacity>
            </View>
        </GlassCard>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    borderColor: { // helper for dynamic borderColor use
        borderColor: 'rgba(255, 255, 255, 0.1)'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    rankBadge: {
        backgroundColor: COLORS.brandBlue,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    rankText: { color: '#000', fontSize: 10, fontWeight: '800' },
    price: { ...TYPOGRAPHY.label, fontWeight: '700', color: COLORS.successGreen },
    // name color is now dynamic — passed as style prop via textPrimary
    name: { ...TYPOGRAPHY.sectionHeader, fontSize: 18, marginBottom: 4 },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    detailText: { ...TYPOGRAPHY.label },
    availability: { ...TYPOGRAPHY.label, color: COLORS.brandBlue, fontWeight: '600' },
    aiBadge: {
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: SPACING.md,
    },
    aiText: { ...TYPOGRAPHY.label, color: COLORS.brandBlue, fontSize: 11, fontStyle: 'italic' },
    actionBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 100,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookButton: {
        backgroundColor: COLORS.brandBlue,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    bookText: { color: '#000', fontWeight: '800', fontSize: 13 },
    actionRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        alignItems: 'center',
    },
    actionText: {
        ...TYPOGRAPHY.label,
        fontWeight: '700',
        fontSize: 12,
    },
});

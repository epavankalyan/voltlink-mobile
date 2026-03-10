import React, { useState } from 'react';
import { StyleSheet, View, Text, Modal, TextInput, TouchableOpacity, Platform } from 'react-native';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { useThemeStore } from '../../store/themeStore';

interface RatingModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (stationRating: number, appRating: number, comment: string) => void;
    stationName: string;
}

export default function RatingModal({ visible, onClose, onSubmit, stationName }: RatingModalProps) {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    // 0 = unselected, 1 = Down, 5 = Up
    const [stationRating, setStationRating] = useState(0);
    const [appRating, setAppRating] = useState(0);
    const [comment, setComment] = useState('');

    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    const handleSubmit = () => {
        if (stationRating === 0 || appRating === 0) return;
        onSubmit(stationRating, appRating, comment);
        setStationRating(0);
        setAppRating(0);
        setComment('');
    };

    const renderThumbRow = (label: string, currentRating: number, setRating: (r: number) => void) => (
        <View style={styles.ratingCategory}>
            <Text style={[styles.categoryLabel, { color: textSecondary }]}>{label}</Text>
            <View style={styles.thumbsRow}>
                <TouchableOpacity
                    style={[
                        styles.thumbBtn,
                        currentRating === 1 && { backgroundColor: COLORS.alertRed + '20', borderColor: COLORS.alertRed }
                    ]}
                    onPress={() => setRating(1)}
                >
                    <ThumbsDown
                        size={28}
                        color={currentRating === 1 ? COLORS.alertRed : textSecondary}
                        fill={currentRating === 1 ? COLORS.alertRed : 'transparent'}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.thumbBtn,
                        currentRating === 5 && { backgroundColor: COLORS.successGreen + '20', borderColor: COLORS.successGreen }
                    ]}
                    onPress={() => setRating(5)}
                >
                    <ThumbsUp
                        size={28}
                        color={currentRating === 5 ? COLORS.successGreen : textSecondary}
                        fill={currentRating === 5 ? COLORS.successGreen : 'transparent'}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <GlassCard style={styles.modalContent} intensity={60}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.title, { color: textPrimary }]}>Rate Your Experience</Text>
                            <Text style={[styles.subtitle, { color: textSecondary }]} numberOfLines={1}>{stationName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color={textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.ratingSection}>
                        {renderThumbRow('Charging Station', stationRating, setStationRating)}
                        <View style={[styles.divider, { backgroundColor: borderColor }]} />
                        {renderThumbRow('App Experience', appRating, setAppRating)}
                    </View>

                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, borderColor, color: textPrimary }]}
                        placeholder="Additional feedback (optional)..."
                        placeholderTextColor={isDark ? COLORS.textMutedDark : 'rgba(0,0,0,0.4)'}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        numberOfLines={3}
                    />

                    <View style={styles.actions}>
                        <GlassButton title="Maybe Later" variant="secondary" style={{ flex: 1 }} onPress={onClose} />
                        <GlassButton
                            title="Submit"
                            style={{ flex: 2 }}
                            onPress={handleSubmit}
                            disabled={stationRating === 0 || appRating === 0}
                        />
                    </View>
                </GlassCard>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    modalContent: {
        padding: SPACING.xl,
        borderRadius: BORDER_RADIUS.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.xl,
    },
    closeBtn: {
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
    },
    title: { ...TYPOGRAPHY.sectionHeader, fontSize: 20, fontWeight: '800' },
    subtitle: { ...TYPOGRAPHY.label, fontSize: 12, marginTop: 4, letterSpacing: 0.5 },
    ratingSection: {
        marginBottom: SPACING.xl,
        gap: SPACING.md,
    },
    ratingCategory: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
    },
    categoryLabel: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        fontSize: 15,
    },
    thumbsRow: {
        flexDirection: 'row',
        gap: SPACING.lg,
    },
    thumbBtn: {
        width: 54,
        height: 54,
        borderRadius: 27,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    divider: {
        height: 1,
        width: '100%',
        opacity: 0.5,
    },
    input: {
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        padding: SPACING.md,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: SPACING.xl,
        ...TYPOGRAPHY.body,
        fontSize: 14,
    },
    actions: {
        flexDirection: 'row',
        gap: SPACING.md,
    }
});

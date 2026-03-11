import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { useRoleStore } from '../store/roleStore';
import { useThemeStore } from '../store/themeStore';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../utils/theme';
import { Shield, User, Zap } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 2 - SPACING.md) / 2;

export default function RoleSelector() {
    const router = useRouter();
    const { activeRole, setRole } = useRoleStore();
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const [selected, setSelected] = useState<'driver' | 'b2c' | null>(null);
    const transformY = React.useRef(new Animated.Value(60)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(transformY, {
                toValue: 0,
                duration: 700,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 700,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleContinue = () => {
        if (selected) {
            setRole(selected);
            router.replace(selected === 'driver' ? '/driver/dashboard' : '/b2c/dashboard');
        }
    };

    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;

    return (
        <View style={[styles.container, { backgroundColor: bg }]}>
            {/* Background glow */}
            <View style={styles.bgGlow} />

            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <View style={styles.logoContainer}>
                    <Zap color={COLORS.primaryGreen} size={40} />
                </View>
                <Text style={[styles.title, { color: textPrimary }]}>VoltLink</Text>
                <Text style={[styles.tagline, { color: textSecondary }]}>
                    Future of EV Intelligence
                </Text>
            </Animated.View>

            <Animated.View style={[styles.cardsContainer, { transform: [{ translateY: transformY }], opacity: fadeAnim }]}>
                <Text style={[styles.selectLabel, { color: textSecondary }]}>SELECT YOUR ROLE</Text>

                <View style={styles.row}>
                    <RoleCard
                        selected={selected === 'driver'}
                        onPress={() => setSelected('driver')}
                        icon={<Shield color={selected === 'driver' ? COLORS.primaryGreen : textSecondary} size={28} />}
                        title="Driver"
                        subtitle="Fleet charging made simple"
                        isDark={isDark}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                    />
                    <RoleCard
                        selected={selected === 'b2c'}
                        onPress={() => setSelected('b2c')}
                        icon={<User color={selected === 'b2c' ? COLORS.primaryGreen : textSecondary} size={28} />}
                        title="B2C Customer"
                        subtitle="Personal EV charging"
                        isDark={isDark}
                        textPrimary={textPrimary}
                        textSecondary={textSecondary}
                    />
                </View>

                {selected && (
                    <Animated.View style={styles.buttonContainer}>
                        <GlassButton title="Continue →" onPress={handleContinue} style={styles.button} />
                    </Animated.View>
                )}

                <Text style={[styles.demoNote, { color: isDark ? COLORS.textMutedDark : COLORS.textSecondaryLight }]}>
                    Demo Mode • No login required
                </Text>
            </Animated.View>
        </View>
    );
}

function RoleCard({ selected, onPress, icon, title, subtitle, isDark, textPrimary, textSecondary }: any) {
    const borderColor = selected
        ? COLORS.primaryGreen
        : isDark
            ? 'rgba(255,255,255,0.10)'
            : 'rgba(0,0,0,0.08)';

    const bgColor = selected
        ? isDark ? 'rgba(4, 234, 170, 0.12)' : 'rgba(4, 234, 170, 0.08)'
        : isDark ? 'rgba(255,255,255,0.04)' : 'transparent';

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            style={[
                styles.cardWrapper,
                {
                    borderColor,
                    backgroundColor: bgColor,
                    borderWidth: selected ? 2 : 1.5,
                },
            ]}
        >
            <View style={styles.cardContent}>
                <View style={[styles.iconCircle, {
                    backgroundColor: selected
                        ? 'rgba(4, 234, 170, 0.12)'
                        : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }]}>
                    {icon}
                </View>
                <Text style={[styles.cardTitle, { color: textPrimary }]}>{title}</Text>
                <Text style={[styles.cardSubtitle, { color: textSecondary }]}>{subtitle}</Text>
                {selected && (
                    <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    bgGlow: {
        position: 'absolute',
        top: -100,
        left: '50%',
        marginLeft: -150,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(4, 234, 170, 0.04)',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    logoContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(4, 234, 170, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    title: {
        ...TYPOGRAPHY.hero,
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    tagline: {
        ...TYPOGRAPHY.body,
        fontSize: 15,
        marginTop: 4,
    },
    cardsContainer: {
        width: '100%',
    },
    selectLabel: {
        ...TYPOGRAPHY.label,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: SPACING.md,
    },
    cardWrapper: {
        flex: 1,
        borderRadius: BORDER_RADIUS.lg,
        overflow: 'hidden',
    },
    cardContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.md,
        minHeight: 180,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    cardTitle: {
        ...TYPOGRAPHY.sectionHeader,
        fontSize: 17,
        fontWeight: '700',
        textAlign: 'center',
    },
    cardSubtitle: {
        ...TYPOGRAPHY.label,
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
        lineHeight: 16,
    },
    checkmark: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.primaryGreen,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '800',
    },
    buttonContainer: {
        marginTop: SPACING.xl,
    },
    button: {
        width: '100%',
        height: 54,
        borderRadius: BORDER_RADIUS.lg,
    },
    demoNote: {
        ...TYPOGRAPHY.label,
        fontSize: 11,
        textAlign: 'center',
        marginTop: SPACING.lg,
    },
});

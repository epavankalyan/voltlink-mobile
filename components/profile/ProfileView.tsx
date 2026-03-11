import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch, Alert, Modal, TextInput, Dimensions, Platform } from 'react-native';
const { width } = Dimensions.get('window');
import { User, Shield, Info, LogOut, Moon, Sun, ChevronRight, Globe, Plus, Trash2, Leaf, Zap, Cloud, Trophy } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { useThemeStore } from '../../store/themeStore';
import { useRoleStore } from '../../store/roleStore';
import { useVehicleStore } from '../../store/vehicleStore';
import { useRouter } from 'expo-router';
import { getSustainabilityStats } from '../../services/b2c.service'; // Added

interface ProfileViewProps {
    name: string;
    email: string;
    role: string;
}

const RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'];

export const ProfileView: React.FC<ProfileViewProps> = ({ name, email, role }) => {
    const { theme, toggleTheme } = useThemeStore();
    const { switchRole, setRole } = useRoleStore();
    const { familyVehicles, fetchFamilyVehicles, addFamilyMemberApi, removeFamilyMemberApi } = useVehicleStore();
    const isDark = theme === 'dark';
    const router = useRouter();

    const [showAddFamily, setShowAddFamily] = useState(false);
    const [newMember, setNewMember] = useState({ name: '', relation: 'Spouse', phone: '' });
    const [sustainability, setSustainability] = useState<any>(null); // Added

    React.useEffect(() => {
        if (role === 'b2c') {
            getSustainabilityStats().then(setSustainability).catch(console.error);
            fetchFamilyVehicles();
        }
    }, [role]);

    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
    const inputBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';

    const handleLogout = () => {
        setRole(null as any);
        router.replace('/');
    };

    const handleSwitchRole = () => {
        switchRole();
        const newRole = role === 'driver' ? 'b2c' : 'driver';
        router.replace(newRole === 'driver' ? '/driver/dashboard' : '/b2c/dashboard');
    };

    const handleRemoveMember = (id: string) => {
        Alert.alert(
            "Remove Member",
            "Are you sure you want to remove this family member?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => removeFamilyMemberApi(id)
                }
            ]
        );
    };

    const handleAddMember = async () => {
        if (!newMember.name) {
            Alert.alert("Error", "Please fill name");
            return;
        }
        try {
            await addFamilyMemberApi({
                name: newMember.name,
                relation: newMember.relation
            });
            setShowAddFamily(false);
            setNewMember({ name: '', relation: 'Spouse', phone: '' });
        } catch (error) {
            Alert.alert("Error", "Failed to add family member");
        }
    };

    return (
        <View style={styles.wrapper}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Avatar + Name */}
                <View style={styles.avatarSection}>
                    <View style={[styles.avatarCircle, { borderColor: COLORS.brandBlue }]}>
                        <User color={COLORS.brandBlue} size={36} />
                    </View>
                    <Text style={[styles.name, { color: textPrimary }]}>{name}</Text>
                    <Text style={[styles.email, { color: textSecondary }]}>{email}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{role === 'driver' ? '🚗  DRIVER' : '👤  B2C CUSTOMER'}</Text>
                    </View>

                    <TouchableOpacity style={styles.logoutInline} onPress={handleLogout} activeOpacity={0.8}>
                        <LogOut size={16} color={COLORS.alertRed} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                {/* B2C Specific: Sustainability Grid */}
                {role === 'b2c' && (
                    <>
                        <Text style={[styles.sectionTitle, { color: textSecondary }]}>SUSTAINABILITY SCORE</Text>
                        <View style={styles.sustainGrid}>
                            <GlassCard style={styles.sustainItem} intensity={10}>
                                <Leaf size={20} color={COLORS.successGreen} />
                                <Text style={[styles.sustainValue, { color: textPrimary }]}>{sustainability?.greenScore ?? '--'}</Text>
                                <Text style={[styles.sustainLabel, { color: textSecondary }]}>Green Score</Text>
                            </GlassCard>
                            <GlassCard style={styles.sustainItem} intensity={10}>
                                <Cloud size={20} color={COLORS.brandBlue} />
                                <Text style={[styles.sustainValue, { color: textPrimary }]}>{sustainability?.carbonSavedKg ?? '--'}kg</Text>
                                <Text style={[styles.sustainLabel, { color: textSecondary }]}>CO2 Saved</Text>
                            </GlassCard>

                            <GlassCard style={styles.sustainItem} intensity={10}>
                                <Trophy size={20} color={COLORS.warningOrange} />
                                <Text style={[styles.sustainValue, { color: textPrimary }]}>#{sustainability?.carbonRank ?? '--'}</Text>
                                <Text style={[styles.sustainLabel, { color: textSecondary }]}>Global Rank</Text>
                            </GlassCard>
                        </View>
                    </>
                )}

                {/* B2C Specific: Family Management */}
                {role === 'b2c' && (
                    <>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={[styles.sectionTitle, { color: textSecondary }]}>FAMILY MEMBERS</Text>
                            <TouchableOpacity onPress={() => setShowAddFamily(true)}>
                                <Plus size={18} color={COLORS.primaryGreen} />
                            </TouchableOpacity>
                        </View>
                        <GlassCard style={[styles.menuCard, { borderColor }] as any} intensity={15}>
                            {familyVehicles.length === 0 ? (
                                <Text style={[styles.emptyText, { color: textSecondary }]}>No family members added</Text>
                            ) : (
                                familyVehicles.map((member, idx) => (
                                    <View key={member.id} style={[styles.menuItem, idx === familyVehicles.length - 1 ? { borderBottomWidth: 0 } : { borderBottomColor: borderColor }]}>
                                        <View style={styles.menuLeft}>
                                            <View style={styles.memberAvatar}>
                                                <Text style={styles.memberInitial}>{member.memberName?.[0] || '?'}</Text>
                                            </View>
                                            <View>
                                                <Text style={[styles.menuText, { color: textPrimary }]}>{member.memberName}</Text>
                                                <Text style={[styles.subText, { color: textSecondary }]}>{member.vehicleModel} • {member.batteryLevel}% Battery</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemoveMember(member.id)}>
                                            <Trash2 size={16} color={COLORS.alertRed} />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </GlassCard>
                    </>
                )}

                {/* Preferences */}
                <Text style={[styles.sectionTitle, { color: textSecondary }]}>PREFERENCES</Text>
                <GlassCard style={[styles.menuCard, { borderColor }] as any} intensity={15}>
                    <View style={[styles.menuItem, { borderBottomColor: borderColor }]}>
                        <View style={styles.menuLeft}>
                            {isDark ? <Moon size={20} color={COLORS.brandBlue} /> : <Sun size={20} color={COLORS.brandBlue} />}
                            <Text style={[styles.menuText, { color: textPrimary }]}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: COLORS.darkTertiary, true: COLORS.brandBlue }}
                            thumbColor="#FFF"
                        />
                    </View>


                    <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleSwitchRole}>
                        <View style={styles.menuLeft}>
                            <Shield size={20} color={COLORS.brandBlue} />
                            <Text style={[styles.menuText, { color: textPrimary }]}>
                                Switch to {role === 'driver' ? 'B2C Customer' : 'Driver'} View
                            </Text>
                        </View>
                        <ChevronRight size={16} color={COLORS.textMutedDark} />
                    </TouchableOpacity>
                </GlassCard>

                {/* Support */}
                <Text style={[styles.sectionTitle, { color: textSecondary }]}>SUPPORT</Text>
                <GlassCard style={[styles.menuCard, { borderColor }] as any} intensity={15}>
                    <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                        <View style={styles.menuLeft}>
                            <Info size={20} color={COLORS.brandBlue} />
                            <Text style={[styles.menuText, { color: textPrimary }]}>Help & Support</Text>
                        </View>
                        <ChevronRight size={16} color={COLORS.textMutedDark} />
                    </TouchableOpacity>
                </GlassCard>

                <Text style={[styles.version, { color: COLORS.textMutedDark }]}>VoltLink Mobile v1.0.0 · Demo Build</Text>
            </ScrollView>

            {/* Add Family Modal */}
            <Modal visible={showAddFamily} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalContent} intensity={60}>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>Add Family Member</Text>

                        <TextInput
                            style={[styles.input, { backgroundColor: inputBg, borderColor: borderColor, color: textPrimary }]}
                            placeholder="Full Name"
                            placeholderTextColor={textSecondary}
                            value={newMember.name}
                            onChangeText={t => setNewMember(p => ({ ...p, name: t }))}
                        />

                        <Text style={[styles.subLabel, { color: textSecondary }]}>RELATION</Text>
                        <View style={styles.relationRow}>
                            {RELATIONS.map(r => (
                                <TouchableOpacity
                                    key={r}
                                    onPress={() => setNewMember(p => ({ ...p, relation: r }))}
                                    style={[styles.relationPill, newMember.relation === r && { backgroundColor: COLORS.primaryGreen, borderColor: COLORS.primaryGreen }]}
                                >
                                    <Text style={[styles.relationText, { color: newMember.relation === r ? '#000' : textSecondary }]}>{r}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <GlassButton title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setShowAddFamily(false)} />
                            <GlassButton title="Add" style={{ flex: 1 }} onPress={handleAddMember} />
                        </View>
                    </GlassCard>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: { flex: 1 },
    container: { flex: 1 },
    scrollContent: { padding: SPACING.lg, paddingBottom: 100 },
    avatarSection: { alignItems: 'center', marginTop: SPACING.lg, marginBottom: SPACING.xl },
    avatarCircle: {
        width: 76, height: 76, borderRadius: 38,
        backgroundColor: 'rgba(0,212,255,0.08)',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: SPACING.md,
        borderWidth: 1.5,
    },
    name: { ...TYPOGRAPHY.sectionHeader, fontSize: 22, fontWeight: '700' },
    email: { ...TYPOGRAPHY.body, fontSize: 14, marginTop: 4, marginBottom: SPACING.md },
    roleBadge: {
        paddingHorizontal: 14, paddingVertical: 5,
        borderRadius: 14, backgroundColor: 'rgba(0,212,255,0.12)',
        borderWidth: 1, borderColor: 'rgba(0,212,255,0.25)',
    },
    roleText: { color: COLORS.brandBlue, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    sectionTitle: { ...TYPOGRAPHY.label, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: SPACING.sm, marginLeft: 4 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingRight: SPACING.xs },
    menuCard: { marginBottom: SPACING.xl, borderRadius: BORDER_RADIUS.lg, padding: 0, overflow: 'hidden', borderWidth: 1 },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: SPACING.lg, borderBottomWidth: 1,
    },
    menuLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    menuText: { ...TYPOGRAPHY.body, fontWeight: '500' },
    subText: { ...TYPOGRAPHY.label, fontSize: 12, marginTop: 2 },
    emptyText: { textAlign: 'center', padding: SPACING.xl, ...TYPOGRAPHY.label },
    memberAvatar: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: COLORS.brandBlue + '20',
        justifyContent: 'center', alignItems: 'center',
    },
    memberInitial: { color: COLORS.brandBlue, fontWeight: 'bold' },
    sustainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.xl },
    sustainItem: {
        width: (width - SPACING.lg * 2 - SPACING.md) / 2,
        padding: SPACING.md, gap: 4, alignItems: 'center'
    },
    sustainValue: { ...TYPOGRAPHY.sectionHeader, fontSize: 18, fontWeight: '800' },
    sustainLabel: { ...TYPOGRAPHY.label, fontSize: 10, letterSpacing: 0.5 },
    languageRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm, marginLeft: 36 },
    languagePill: {
        paddingHorizontal: SPACING.md, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    languageText: { ...TYPOGRAPHY.label, fontWeight: '600' },
    version: { ...TYPOGRAPHY.label, fontSize: 11, textAlign: 'center', marginTop: SPACING.md },
    logoutInline: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: SPACING.sm, marginTop: SPACING.md,
        paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.xl,
        borderWidth: 1, borderColor: 'rgba(255,68,68,0.35)',
        backgroundColor: 'rgba(255,68,68,0.08)',
    },
    logoutText: { ...TYPOGRAPHY.body, color: COLORS.alertRed, fontWeight: '700', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.lg },
    modalContent: { padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg },
    modalTitle: { ...TYPOGRAPHY.sectionHeader, marginBottom: SPACING.lg },
    input: { height: 48, borderRadius: BORDER_RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, marginBottom: SPACING.md, ...TYPOGRAPHY.body },
    subLabel: { ...TYPOGRAPHY.label, fontSize: 10, fontWeight: '800', marginBottom: SPACING.sm },
    relationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl },
    relationPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    relationText: { ...TYPOGRAPHY.label, fontSize: 11, fontWeight: '700' },
    modalActions: { flexDirection: 'row', gap: SPACING.md }
});

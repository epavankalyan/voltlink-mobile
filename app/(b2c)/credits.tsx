import React, { useEffect, useState } from 'react';
import {
    StyleSheet, View, FlatList, Text, TouchableOpacity, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    TrendingUp, TrendingDown, ArrowRightLeft, Banknote, Zap, Leaf, Download
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { getB2CStats, getCreditTransactions } from '../../services/b2c.service';
import { useThemeStore } from '../../store/themeStore';
import { format } from 'date-fns';

interface CreditTransaction {
    id: string;
    type: 'earned' | 'spent';
    amount: number;
    description: string;
    date: string;
}

export default function CreditsScreen() {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';

    const [stats, setStats] = useState<any>(null);
    const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
    const [transferModal, setTransferModal] = useState(false);
    const [sellModal, setSellModal] = useState(false);

    const fetchData = async () => {
        try {
            const sData = await getB2CStats();
            const tData = await getCreditTransactions();
            setStats(sData);
            setTransactions(tData);
        } catch (error) {
            console.error('Error fetching credits data:', error);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;

    const renderTransaction = ({ item }: { item: CreditTransaction }) => (
        <View style={[styles.txRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <View style={[styles.txIcon, { backgroundColor: item.type === 'earned' ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)' }]}>
                {item.type === 'earned'
                    ? <TrendingUp size={18} color={COLORS.successGreen} />
                    : <TrendingDown size={18} color={COLORS.alertRed} />}
            </View>
            <View style={styles.txInfo}>
                <Text style={[styles.txTitle, { color: textPrimary }]}>{item.description}</Text>
                <Text style={[styles.txDate, { color: textSecondary }]}>
                    {format(new Date(item.date), 'dd MMM yyyy, HH:mm')}
                </Text>
            </View>
            <Text style={[styles.txAmount, { color: item.type === 'earned' ? COLORS.successGreen : COLORS.alertRed }]}>
                {item.type === 'earned' ? '+' : '-'}{item.amount}
            </Text>
        </View>
    );

    const handleExportCSV = () => {
        Alert.alert('Export Successful', 'Your credit history has been exported to CSV.');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
            {/* Transfer Modal */}
            <Modal visible={transferModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalCard as any} intensity={60}>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>Transfer Credits</Text>
                        <Text style={[styles.modalSub, { color: textSecondary }]}>Select a family member to transfer credits to:</Text>
                        {(stats?.family_members || []).map((m: any) => (
                            <TouchableOpacity key={m.id} style={styles.modalOption}
                                onPress={() => { setTransferModal(false); Alert.alert('Transferred', `50 credits sent to ${m.name}.`); }}>
                                <Text style={[styles.modalOptionText, { color: textPrimary }]}>{m.name} ({m.relation})</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => setTransferModal(false)} style={styles.modalCancel}>
                            <Text style={{ color: COLORS.alertRed, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </View>
            </Modal>

            {/* Sell Modal */}
            <Modal visible={sellModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalCard as any} intensity={60}>
                        <Text style={[styles.modalTitle, { color: textPrimary }]}>Sell Credits</Text>
                        <Text style={[styles.modalSub, { color: textSecondary }]}>
                            Market rate: ₹0.80 per credit{'\n'}You have {stats?.availableCredits || 0} credits available
                        </Text>
                        <GlassCard style={styles.sellPreview as any} intensity={15}>
                            <Text style={[styles.sellLabel, { color: textSecondary }]}>Estimated Payout</Text>
                            <Text style={styles.sellValue}>₹{((stats?.availableCredits || 0) * 0.80).toFixed(0)}</Text>
                        </GlassCard>
                        <TouchableOpacity style={styles.sellConfirmBtn}
                            onPress={() => { setSellModal(false); Alert.alert('Credits Sold', 'Your credits have been cashed out!'); }}>
                            <Text style={styles.sellConfirmText}>Confirm Sale</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setSellModal(false)} style={styles.modalCancel}>
                            <Text style={{ color: COLORS.alertRed, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                    </GlassCard>
                </View>
            </Modal>

            <FlatList
                data={transactions}
                keyExtractor={(item) => item.id}
                renderItem={renderTransaction}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <>
                        {/* Title */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: textPrimary }]}>VoltCredits</Text>
                            <TouchableOpacity onPress={handleExportCSV} style={styles.exportBtn}>
                                <Download size={18} color={COLORS.brandBlue} />
                            </TouchableOpacity>
                        </View>

                        {/* Balance Card */}
                        <GlassCard style={styles.balanceCard as any} intensity={40}>
                            <Text style={[styles.balanceLabel, { color: 'rgba(255,255,255,0.7)' }]}>Current Balance</Text>
                            <Text style={styles.balanceValue}>{stats?.availableCredits || 0}</Text>
                            <View style={styles.balanceRow}>
                                <View style={styles.balanceItem}>
                                    <Text style={styles.balanceSubLabel}>Lifetime Earned</Text>
                                    <Text style={styles.balanceSubValue}>{stats?.totalCredits || 0}</Text>
                                </View>
                                <View style={[styles.balanceDivider]} />
                                <View style={styles.balanceItem}>
                                    <Text style={styles.balanceSubLabel}>Redeemed</Text>
                                    <Text style={styles.balanceSubValue}>{stats?.usedCredits || 0}</Text>
                                </View>
                            </View>
                        </GlassCard>

                        {/* Action Row */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => setTransferModal(true)}>
                                <View style={styles.actionIcon}><ArrowRightLeft size={20} color={COLORS.brandBlue} /></View>
                                <Text style={[styles.actionLabel, { color: textPrimary }]}>Transfer</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => setSellModal(true)}>
                                <View style={styles.actionIcon}><Banknote size={20} color={COLORS.successGreen} /></View>
                                <Text style={[styles.actionLabel, { color: textPrimary }]}>Sell</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn}
                                onPress={() => Alert.alert('Applied', 'Credits will be applied to your next charge.')}>
                                <View style={styles.actionIcon}><Zap size={20} color={COLORS.warningOrange} /></View>
                                <Text style={[styles.actionLabel, { color: textPrimary }]}>Apply</Text>
                            </TouchableOpacity>
                        </View>

                        {/* V2G Card */}
                        <GlassCard style={styles.v2gCard as any} intensity={20}>
                            <View style={styles.v2gRow}>
                                <Leaf size={20} color={COLORS.successGreen} />
                                <View style={styles.v2gInfo}>
                                    <Text style={[styles.v2gTitle, { color: textPrimary }]}>Vehicle-to-Grid (V2G)</Text>
                                    <Text style={[styles.v2gSub, { color: textSecondary }]}>
                                        Current rate: ₹6.50/kWh · Est. earn ₹180 this month
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.v2gBtn}
                                onPress={() => Alert.alert('V2G', 'Navigate to a charging session to enable V2G.')}>
                                <Text style={styles.v2gBtnText}>Start V2G Session →</Text>
                            </TouchableOpacity>
                        </GlassCard>

                        {/* Sustainability */}
                        <GlassCard style={styles.sustainCard as any} intensity={20}>
                            <View style={styles.sustainRow}>
                                <Leaf size={20} color={COLORS.successGreen} />
                                <Text style={[styles.sustainTitle, { color: textPrimary }]}>Carbon Saved This Month</Text>
                            </View>
                            <Text style={styles.sustainValue}>{stats?.carbonSavedKg || 0} kg CO₂</Text>
                            <Text style={[styles.sustainRank, { color: textSecondary }]}>
                                🏆 You're in the top 12% of green drivers in your city
                            </Text>
                        </GlassCard>

                        <Text style={[styles.sectionLabel, { color: textSecondary }]}>TRANSACTION HISTORY</Text>
                    </>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    },
    title: { ...TYPOGRAPHY.hero, fontSize: 26 },
    exportBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(0,212,255,0.1)' },
    list: { paddingHorizontal: SPACING.lg, paddingBottom: 120 },
    balanceCard: {
        padding: SPACING.xl, borderRadius: BORDER_RADIUS.xl, alignItems: 'center', marginBottom: SPACING.md,
    },
    balanceLabel: { ...TYPOGRAPHY.label, marginBottom: SPACING.xs },
    balanceValue: { ...TYPOGRAPHY.hero, fontSize: 52, fontWeight: '800', color: COLORS.brandBlue },
    balanceRow: { flexDirection: 'row', width: '100%', marginTop: SPACING.lg },
    balanceItem: { flex: 1, alignItems: 'center' },
    balanceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
    balanceSubLabel: { ...TYPOGRAPHY.label, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
    balanceSubValue: { ...TYPOGRAPHY.body, fontWeight: '700', color: '#FFFFFF' },
    actionRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
    actionBtn: { flex: 1, alignItems: 'center', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    actionIcon: { marginBottom: 6 },
    actionLabel: { ...TYPOGRAPHY.label, fontWeight: '700', fontSize: 13 },
    v2gCard: { padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md },
    v2gRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.md },
    v2gInfo: { flex: 1 },
    v2gTitle: { ...TYPOGRAPHY.body, fontWeight: '700' },
    v2gSub: { ...TYPOGRAPHY.label, marginTop: 2 },
    v2gBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,255,136,0.12)', paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: BORDER_RADIUS.md },
    v2gBtnText: { color: COLORS.successGreen, fontWeight: '700', fontSize: 13 },
    sustainCard: { padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md },
    sustainRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
    sustainTitle: { ...TYPOGRAPHY.body, fontWeight: '700' },
    sustainValue: { ...TYPOGRAPHY.hero, fontSize: 28, color: COLORS.successGreen, fontWeight: '800' },
    sustainRank: { ...TYPOGRAPHY.label, marginTop: 4 },
    sectionLabel: { ...TYPOGRAPHY.label, fontWeight: '700', letterSpacing: 1, marginBottom: SPACING.sm, marginTop: SPACING.sm, fontSize: 11 },
    txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1 },
    txIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
    txInfo: { flex: 1 },
    txTitle: { ...TYPOGRAPHY.body, fontWeight: '600' },
    txDate: { ...TYPOGRAPHY.label, marginTop: 2 },
    txAmount: { ...TYPOGRAPHY.body, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', padding: SPACING.lg },
    modalCard: { padding: SPACING.xl, borderRadius: BORDER_RADIUS.xl },
    modalTitle: { ...TYPOGRAPHY.sectionHeader, fontWeight: '700', marginBottom: SPACING.sm },
    modalSub: { ...TYPOGRAPHY.body, marginBottom: SPACING.lg },
    modalOption: { paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
    modalOptionText: { ...TYPOGRAPHY.body, fontWeight: '500' },
    modalCancel: { paddingTop: SPACING.lg, alignItems: 'center' },
    sellPreview: { padding: SPACING.lg, borderRadius: BORDER_RADIUS.md, alignItems: 'center', marginBottom: SPACING.lg },
    sellLabel: { ...TYPOGRAPHY.label },
    sellValue: { ...TYPOGRAPHY.hero, fontSize: 36, color: COLORS.successGreen, fontWeight: '800' },
    sellConfirmBtn: { backgroundColor: COLORS.successGreen, height: 50, borderRadius: BORDER_RADIUS.xl, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
    sellConfirmText: { color: '#000', fontWeight: '800', fontSize: 16 },
});

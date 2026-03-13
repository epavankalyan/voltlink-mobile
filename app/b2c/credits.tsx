import React, { useEffect, useState, useMemo } from 'react';
import {
    StyleSheet, View, Text, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wallet, ArrowDownLeft, ArrowUpRight, Leaf, Zap, ArrowLeftRight, ChevronDown } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../utils/theme';
import { GlassCard } from '../../components/ui/GlassCard';
import { getCreditBalance, getCreditTransactions, transferCredits } from '../../services/b2c.service';
import { useThemeStore } from '../../store/themeStore';

const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_DEFAULT_USER_ID ?? '3';

// ─── helpers ──────────────────────────────────────────────────────────────────
const titleCase = (s: string) =>
    s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const sourceIcon = (category: string, size = 16, color = COLORS.successGreen) =>
    category === 'renewable'
        ? <Leaf size={size} color={color} />
        : <Zap size={size} color={COLORS.warningOrange} />;

// ─── types ────────────────────────────────────────────────────────────────────
interface LedgerEntry {
    id: number;
    entry_type: 'credit' | 'debit';
    amount: number;
    reason: string;
    description: string;
    created_at: string;
    energy_source?: { id: string; name: string; category: string };
}

// ─── component ────────────────────────────────────────────────────────────────
export default function CreditsScreen() {
    const { theme } = useThemeStore();
    const isDark = theme === 'dark';
    const uid = DEFAULT_USER_ID;

    const [balance, setBalance] = useState<{ current_balance: number; account_id: number } | null>(null);
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // transfer form
    const [recipientId, setRecipientId] = useState('');
    const [transferAmt, setTransferAmt] = useState('');
    const [transferDesc, setTransferDesc] = useState('');
    const [selectedSourceId, setSelectedSourceId] = useState('');
    const [transferring, setTransferring] = useState(false);

    // filter
    const [filterSource, setFilterSource] = useState('All Sources');
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    const bg = isDark ? COLORS.darkBg : COLORS.lightBg;
    const textPrimary = isDark ? COLORS.textPrimaryDark : COLORS.textPrimaryLight;
    const textSecondary = isDark ? COLORS.textSecondaryDark : COLORS.textSecondaryLight;
    const cardBg = isDark ? '#121820' : '#fff';
    const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    const inputBg = isDark ? '#1a2230' : '#f0f2f5';

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bal, ledger] = await Promise.all([
                getCreditBalance(uid),
                getCreditTransactions(uid),
            ]);
            setBalance(bal);
            setEntries(ledger);
        } catch (e) {
            console.error('Credits fetch error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // ─── derived values ──────────────────────────────────────────────────────
    const totalReceived = useMemo(
        () => entries.filter(e => e.entry_type === 'credit').reduce((s, e) => s + e.amount, 0),
        [entries]
    );
    const totalSent = useMemo(
        () => entries.filter(e => e.entry_type === 'debit').reduce((s, e) => s + e.amount, 0),
        [entries]
    );

    // Group credit entries by energy source
    const bySource = useMemo(() => {
        const map: Record<string, { name: string; category: string; total: number }> = {};
        entries
            .filter(e => e.entry_type === 'credit' && e.energy_source)
            .forEach(e => {
                const src = e.energy_source!;
                if (!map[src.id]) map[src.id] = { name: src.name, category: src.category, total: 0 };
                map[src.id].total += e.amount;
            });
        return Object.values(map);
    }, [entries]);

    // Unique source names for filter dropdown
    const sourceNames = useMemo(() => {
        const names = new Set(entries.map(e => e.energy_source?.name).filter(Boolean) as string[]);
        return ['All Sources', ...Array.from(names)];
    }, [entries]);

    // Unique sources for transfer picker
    const uniqueSources = useMemo(() => {
        const map: Record<string, { id: string; name: string }> = {};
        entries.forEach(e => {
            if (e.energy_source) map[e.energy_source.id] = { id: e.energy_source.id, name: e.energy_source.name };
        });
        return Object.values(map);
    }, [entries]);

    const filteredEntries = useMemo(
        () => filterSource === 'All Sources'
            ? entries
            : entries.filter(e => e.energy_source?.name === filterSource),
        [entries, filterSource]
    );

    // ─── transfer handler ────────────────────────────────────────────────────
    const handleTransfer = async () => {
        if (!recipientId || !transferAmt || isNaN(Number(transferAmt))) {
            Alert.alert('Invalid Input', 'Please enter a valid recipient ID and amount.');
            return;
        }
        const amount = parseFloat(transferAmt);
        if (amount <= 0 || amount > (balance?.current_balance ?? 0)) {
            Alert.alert('Invalid Amount', 'Amount must be positive and within your balance.');
            return;
        }
        setTransferring(true);
        try {
            await transferCredits(uid, {
                recipient_user_id: parseInt(recipientId),
                amount,
                energy_source_id: selectedSourceId || undefined,
                description: transferDesc || undefined,
            });
            Alert.alert('Success', `${amount.toFixed(2)} CR transferred successfully.`);
            setRecipientId('');
            setTransferAmt('');
            setTransferDesc('');
            setSelectedSourceId('');
            fetchData();
        } catch (e: any) {
            Alert.alert('Transfer Failed', e?.response?.data?.message || 'Please try again.');
        } finally {
            setTransferring(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.successGreen} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bg }]} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: textPrimary }]}>Credit Balance</Text>
                    <Text style={[styles.subtitle, { color: textSecondary }]}>
                        Track energy credits by source, view transaction history, and transfer credits.
                    </Text>
                </View>

                {/* ── 3-tile stat row ── */}
                <View style={styles.statRow}>
                    {/* Current Balance */}
                    <View style={[styles.statTile, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.statTileHeader}>
                            <Wallet size={14} color={COLORS.brandBlue} />
                            <Text style={[styles.statTileLabel, { color: textSecondary }]}>Credits</Text>
                        </View>
                        <Text style={[styles.statTileValue, { color: textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                            {(balance?.current_balance ?? 0).toFixed(2)}
                        </Text>
                    </View>

                    {/* Credits Received */}
                    <View style={[styles.statTile, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.statTileHeader}>
                            <ArrowDownLeft size={14} color={COLORS.successGreen} />
                            <Text style={[styles.statTileLabel, { color: textSecondary }]}>{'Received'}</Text>
                        </View>
                        <Text style={[styles.statTileValue, { color: COLORS.successGreen }]} numberOfLines={1} adjustsFontSizeToFit>
                            +{totalReceived.toFixed(2)}
                        </Text>
                    </View>

                    {/* Credits Sent */}
                    <View style={[styles.statTile, { backgroundColor: cardBg, borderColor }]}>
                        <View style={styles.statTileHeader}>
                            <ArrowUpRight size={14} color={COLORS.alertRed} />
                            <Text style={[styles.statTileLabel, { color: textSecondary }]}>Sent</Text>
                        </View>
                        <Text style={[styles.statTileValue, { color: COLORS.alertRed }]} numberOfLines={1} adjustsFontSizeToFit>
                            -{totalSent.toFixed(2)}
                        </Text>
                    </View>
                </View>




                {/* ── Transaction History ── */}
                <GlassCard style={[styles.card, { backgroundColor: cardBg, borderColor }] as any} intensity={15}>
                    <View style={styles.sectionHeader}>
                        <ArrowLeftRight size={18} color={COLORS.successGreen} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Transaction History</Text>
                            <Text style={[styles.sectionSub, { color: textSecondary }]}>Recent credit movements</Text>
                        </View>
                    </View>

                    {/* Filter row */}
                    <View style={styles.filterRow}>
                        <Text style={[styles.filterLabel, { color: textSecondary }]}>Filter by source:</Text>
                        <TouchableOpacity
                            style={[styles.filterPicker, { backgroundColor: inputBg, borderColor }]}
                            onPress={() => setShowFilterMenu(v => !v)}
                        >
                            <Text style={[styles.filterPickerText, { color: textPrimary }]}>{filterSource}</Text>
                            <ChevronDown size={14} color={textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {showFilterMenu && (
                        <View style={[styles.filterMenu, { backgroundColor: inputBg, borderColor }]}>
                            {sourceNames.map(name => (
                                <TouchableOpacity
                                    key={name}
                                    style={styles.filterMenuItem}
                                    onPress={() => { setFilterSource(name); setShowFilterMenu(false); }}
                                >
                                    <Text style={[styles.filterMenuItemText, { color: name === filterSource ? COLORS.successGreen : textPrimary }]}>
                                        {name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Table header */}
                    <View style={[styles.tableHeaderRow, { borderBottomColor: borderColor }]}>
                        <Text style={[styles.tableHeaderCol, { color: textSecondary }]}>Type</Text>
                        <Text style={[styles.tableHeaderCol, { color: textSecondary, flex: 1.5 }]}>Reason</Text>
                        <Text style={[styles.tableHeaderCol, { color: textSecondary, textAlign: 'right' }]}>Energy Source</Text>
                    </View>

                    {filteredEntries.map((entry, i) => {
                        const isCredit = entry.entry_type === 'credit';
                        return (
                            <View
                                key={entry.id}
                                style={[
                                    styles.txRow,
                                    { borderBottomColor: borderColor },
                                    i % 2 !== 0 && { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }
                                ]}
                            >
                                {/* Type pill */}
                                <View style={styles.txTypeCell}>
                                    {isCredit
                                        ? <ArrowDownLeft size={14} color={COLORS.successGreen} />
                                        : <ArrowUpRight size={14} color={COLORS.alertRed} />
                                    }
                                    <View style={[
                                        styles.pill,
                                        { backgroundColor: isCredit ? COLORS.successGreen : COLORS.brandBlue }
                                    ]}>
                                        <Text style={styles.pillText}>{entry.entry_type}</Text>
                                    </View>
                                </View>

                                {/* Reason */}
                                <Text style={[styles.txReason, { color: textPrimary }]}>
                                    {titleCase(entry.reason)}
                                </Text>

                                {/* Energy source */}
                                {entry.energy_source ? (
                                    <View style={styles.txSourceCell}>
                                        {sourceIcon(entry.energy_source.category, 13)}
                                        <Text style={[styles.txSourceText, { color: textPrimary }]}>
                                            {entry.energy_source.name}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={[styles.txSourceText, { color: textSecondary }]}>—</Text>
                                )}
                            </View>
                        );
                    })}
                </GlassCard>

                {/* ── Transfer Credits ── */}
                <GlassCard style={[styles.card, { backgroundColor: cardBg, borderColor }] as any} intensity={15}>
                    <View style={styles.sectionHeader}>
                        <ArrowLeftRight size={18} color={COLORS.successGreen} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Transfer Credits</Text>
                            <Text style={[styles.sectionSub, { color: textSecondary }]}>
                                Send energy credits to another user by their User ID.
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.fieldLabel, { color: textPrimary }]}>Recipient User ID</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor }]}
                        placeholder="Enter user ID"
                        placeholderTextColor={textSecondary}
                        value={recipientId}
                        onChangeText={setRecipientId}
                        keyboardType="numeric"
                    />

                    <Text style={[styles.fieldLabel, { color: textPrimary }]}>Amount (CR)</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor }]}
                        placeholder="0.00"
                        placeholderTextColor={textSecondary}
                        value={transferAmt}
                        onChangeText={setTransferAmt}
                        keyboardType="decimal-pad"
                    />
                    <Text style={[styles.availableText, { color: textSecondary }]}>
                        Available: {(balance?.current_balance ?? 0).toFixed(2)} CR
                    </Text>

                    <Text style={[styles.fieldLabel, { color: textPrimary }]}>
                        Energy Source <Text style={{ fontWeight: '400', opacity: 0.6 }}>(optional)</Text>
                    </Text>
                    <View style={[styles.input, { backgroundColor: inputBg, borderColor, justifyContent: 'center' }]}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                <TouchableOpacity
                                    onPress={() => setSelectedSourceId('')}
                                    style={[styles.sourceChip, selectedSourceId === '' && styles.sourceChipActive]}
                                >
                                    <Text style={[styles.sourceChipText, selectedSourceId === '' && { color: '#000' }]}>
                                        None
                                    </Text>
                                </TouchableOpacity>
                                {uniqueSources.map(src => (
                                    <TouchableOpacity
                                        key={src.id}
                                        onPress={() => setSelectedSourceId(src.id)}
                                        style={[styles.sourceChip, selectedSourceId === src.id && styles.sourceChipActive]}
                                    >
                                        <Text style={[styles.sourceChipText, selectedSourceId === src.id && { color: '#000' }]}>
                                            {src.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </View>

                    <Text style={[styles.fieldLabel, { color: textPrimary }]}>
                        Description <Text style={{ fontWeight: '400', opacity: 0.6 }}>(optional)</Text>
                    </Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: inputBg, color: textPrimary, borderColor }]}
                        placeholder="e.g., Green energy allocation"
                        placeholderTextColor={textSecondary}
                        value={transferDesc}
                        onChangeText={setTransferDesc}
                    />

                    <TouchableOpacity
                        style={[styles.transferBtn, { opacity: transferring ? 0.7 : 1 }]}
                        onPress={handleTransfer}
                        disabled={transferring}
                    >
                        {transferring
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.transferBtnText}>Transfer Credits</Text>
                        }
                    </TouchableOpacity>
                </GlassCard>

            </ScrollView>
        </SafeAreaView>
    );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 120 },

    header: { paddingTop: SPACING.lg, marginBottom: SPACING.lg },
    title: { ...TYPOGRAPHY.hero, fontSize: 30, fontWeight: '800', marginBottom: 6 },
    subtitle: { ...TYPOGRAPHY.body, lineHeight: 22 },

    card: {
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        borderWidth: 1,
    },
    cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardLabel: { ...TYPOGRAPHY.label, fontWeight: '600', fontSize: 13 },
    bigValue: { ...TYPOGRAPHY.hero, fontSize: 22, fontWeight: '800', marginBottom: 2 },
    cardSub: { ...TYPOGRAPHY.label, fontSize: 11 },

    sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.md },
    sectionTitle: { ...TYPOGRAPHY.body, fontWeight: '700', fontSize: 17 },
    sectionSub: { ...TYPOGRAPHY.label, marginTop: 2 },

    // source table
    tableHeaderRow: { flexDirection: 'row', paddingBottom: SPACING.sm, borderBottomWidth: 1, marginBottom: SPACING.xs },
    tableHeaderCol: { ...TYPOGRAPHY.label, flex: 1, fontWeight: '600' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
    sourceCell: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
    sourceName: { ...TYPOGRAPHY.body, fontWeight: '600' },
    renewableBadge: { backgroundColor: 'rgba(0,200,100,0.15)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    renewableBadgeText: { ...TYPOGRAPHY.label, color: COLORS.successGreen, fontWeight: '700', fontSize: 10 },
    creditValue: { ...TYPOGRAPHY.body, fontWeight: '700' },
    totalLabel: { flex: 2, ...TYPOGRAPHY.body, fontWeight: '800' },
    totalValue: { ...TYPOGRAPHY.body, fontWeight: '800', fontSize: 16 },

    // filter
    filterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
    filterLabel: { ...TYPOGRAPHY.label },
    filterPicker: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, borderWidth: 1,
    },
    filterPickerText: { ...TYPOGRAPHY.body, fontSize: 14 },
    filterMenu: { borderRadius: BORDER_RADIUS.md, borderWidth: 1, marginBottom: SPACING.sm, overflow: 'hidden' },
    filterMenuItem: { paddingVertical: 10, paddingHorizontal: 14 },
    filterMenuItemText: { ...TYPOGRAPHY.body, fontSize: 14 },

    // tx table
    txRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, borderBottomWidth: 1, gap: SPACING.sm,
    },
    txTypeCell: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1.2 },
    pill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    pillText: { ...TYPOGRAPHY.label, color: '#fff', fontWeight: '700', fontSize: 10 },
    txReason: { ...TYPOGRAPHY.label, flex: 1.5, fontWeight: '500' },
    txSourceCell: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1.2, justifyContent: 'flex-end' },
    txSourceText: { ...TYPOGRAPHY.label, textAlign: 'right' },

    // transfer form
    fieldLabel: { ...TYPOGRAPHY.label, fontWeight: '700', marginBottom: 6, marginTop: SPACING.md },
    input: {
        borderRadius: BORDER_RADIUS.md, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
        ...TYPOGRAPHY.body, marginBottom: 4
    },
    availableText: { ...TYPOGRAPHY.label, fontSize: 11, marginBottom: SPACING.sm },
    sourceChip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    sourceChipActive: { backgroundColor: COLORS.successGreen },
    sourceChipText: { ...TYPOGRAPHY.label, color: '#ccc', fontWeight: '600' },
    transferBtn: {
        marginTop: SPACING.lg, backgroundColor: COLORS.successGreen + 'CC',
        height: 52, borderRadius: BORDER_RADIUS.xl,
        justifyContent: 'center', alignItems: 'center',
    },
    transferBtnText: { ...TYPOGRAPHY.body, color: '#fff', fontWeight: '800', fontSize: 16 },

    // unified balance panel
    balancePanel: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, marginBottom: SPACING.md, overflow: 'hidden' },
    panelRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md },
    panelLabel: { ...TYPOGRAPHY.label, fontSize: 12, marginBottom: 2 },
    panelValue: { ...TYPOGRAPHY.hero, fontSize: 20, fontWeight: '800' },
    panelSub: { ...TYPOGRAPHY.label, fontSize: 11, marginTop: 2 },
    divider: { height: 1 },

    // 3-tile stat row
    statRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
    statTile: {
        flex: 1, borderRadius: BORDER_RADIUS.lg, borderWidth: 1,
        padding: SPACING.md, paddingBottom: SPACING.lg,
    },
    statTileHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: SPACING.sm },
    statTileLabel: { ...TYPOGRAPHY.label, fontSize: 11, lineHeight: 14 },
    statTileValue: { ...TYPOGRAPHY.hero, fontSize: 15, fontWeight: '800' },
    statTileUnit: { fontSize: 13, fontWeight: '400' },
});

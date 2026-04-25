import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isToday, isYesterday } from 'date-fns';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  ChevronDown,
  DollarSign,
  Package,
  Percent,
  RefreshCw,
  TrendingUp,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import { PageHeader } from '../components/PageHeader';
import { ResyncAllModal } from '../components/ResyncAllModal';
import { colors, font, radius, shadows } from '../constants/theme';
import { useSessions } from '../store/sessions';
import type { SessionProduct } from '../types/product';

interface StatCard {
  readonly label: string;
  readonly value: string;
  readonly sub: string;
  readonly up: boolean;
  readonly icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

interface CategoryStat {
  readonly name: string;
  readonly count: number;
  readonly margin: number;
  readonly fill: number;
}

interface SessionInsight {
  readonly id: string;
  readonly sessionId: string;
  readonly name: string;
  readonly date: string;
  readonly scanned: number;
  readonly profitable: number;
  readonly winningProducts: readonly SessionProduct[];
}

function getProfitPercent(product: SessionProduct) {
  if (product.price <= 0) {
    return 0;
  }

  return (product.profitMargin / product.price) * 100;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSessionDate(isoDate: string) {
  const date = new Date(isoDate);

  if (isToday(date)) {
    return 'Today';
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  return format(date, 'MMM d');
}

function getMargin(product: SessionProduct) {
  return getProfitPercent(product);
}

export default function InsightsPage() {
  const router = useRouter();
  const { sessions, getProducts } = useSessions();
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [showResyncModal, setShowResyncModal] = useState(false);

  const allProducts = useMemo(
    () => sessions.flatMap((session) => getProducts(session.id)),
    [getProducts, sessions],
  );

  const profitableProducts = useMemo(
    () => allProducts.filter((product) => product.profitMargin > 0),
    [allProducts],
  );

  const totalScanned = allProducts.length;
  const winRate = totalScanned > 0 ? (profitableProducts.length / totalScanned) * 100 : 0;
  const avgMargin =
    totalScanned > 0
      ? allProducts.reduce((sum, product) => sum + getProfitPercent(product), 0) / totalScanned
      : 0;
  const potentialRevenue = profitableProducts.reduce((sum, product) => sum + product.price, 0);

  const stats: readonly StatCard[] = [
    {
      label: 'Total Scanned',
      value: totalScanned.toLocaleString(),
      sub: `${sessions.length} active sessions`,
      icon: Package,
      up: true,
    },
    {
      label: 'Avg. Margin',
      value: `${avgMargin.toFixed(1)}%`,
      sub: `${profitableProducts.length.toLocaleString()} profitable items`,
      icon: Percent,
      up: true,
    },
    {
      label: 'Potential Revenue',
      value: formatCurrency(potentialRevenue),
      sub: `${profitableProducts.length.toLocaleString()} items above break-even`,
      icon: DollarSign,
      up: potentialRevenue > 0,
    },
    {
      label: 'Win Rate',
      value: `${winRate.toFixed(0)}%`,
      sub: `${Math.round(winRate)}% of products have margin`,
      icon: TrendingUp,
      up: winRate >= 50,
    },
  ];

  const topCategories = useMemo(() => {
    const categoryMap = new Map<string, { count: number; totalMargin: number }>();

    allProducts.forEach((product) => {
      const entry = categoryMap.get(product.category) ?? { count: 0, totalMargin: 0 };

      categoryMap.set(product.category, {
        count: entry.count + 1,
        totalMargin: entry.totalMargin + getProfitPercent(product),
      });
    });

    const entries = Array.from(categoryMap.entries())
      .map(([name, entry]) => ({
        name,
        count: entry.count,
        margin: entry.totalMargin / entry.count,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);

    const maxCount = entries[0]?.count ?? 1;

    return entries.map<CategoryStat>((entry) => ({
      ...entry,
      fill: Math.max(18, (entry.count / maxCount) * 100),
    }));
  }, [allProducts]);

  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      )
      .slice(0, 5)
      .map<SessionInsight>((session) => {
        const sessionProducts = getProducts(session.id);
        const winningProducts = [...sessionProducts]
          .sort((left, right) => right.profitMargin - left.profitMargin)
          .slice(0, 5);

        return {
          id: session.id,
          sessionId: session.id,
          name: session.title,
          date: formatSessionDate(session.updatedAt),
          scanned: sessionProducts.length,
          profitable: sessionProducts.filter((product) => product.profitMargin > 0).length,
          winningProducts,
        };
      });
  }, [getProducts, sessions]);

  const allProductNames = useMemo(
    () => allProducts.map((product) => product.title),
    [allProducts],
  );

  const toggleSession = (id: string) => {
    setExpandedSessions((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <PageHeader
        title="Insights"
        icon={<BarChart2 size={16} color={colors.accent} strokeWidth={1.8} />}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <View key={stat.label} style={styles.statCard}>
                <View style={styles.statHeaderRow}>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <View style={styles.statIconWrap}>
                    <Icon size={14} color={colors.accent} strokeWidth={1.8} />
                  </View>
                </View>

                <Text style={styles.statValue}>{stat.value}</Text>
                <View style={styles.statSubRow}>
                  {stat.up ? (
                    <ArrowUpRight size={12} color={colors.textMuted} strokeWidth={2} />
                  ) : (
                    <ArrowDownRight size={12} color={colors.textFaint} strokeWidth={2} />
                  )}
                  <Text style={styles.statSub}>{stat.sub}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Top Categories</Text>
          <View style={styles.categoryList}>
            {topCategories.map((category) => (
              <View key={category.name}>
                <View style={styles.categoryHeaderRow}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <View style={styles.categoryMetaRow}>
                    <Text style={styles.categoryMeta}>{category.count} items</Text>
                    <Text style={styles.categoryMargin}>{category.margin.toFixed(0)}%</Text>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFillAmber, { width: `${category.fill}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCardNoPadding}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Session Performance</Text>
            <Pressable style={styles.iconButton} onPress={() => setShowResyncModal(true)}>
              <RefreshCw size={14} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          {recentSessions.map((session, index) => {
            const isOpen = expandedSessions.has(session.id);
            const rate = session.scanned > 0 ? Math.round((session.profitable / session.scanned) * 100) : 0;

            return (
              <View key={session.id} style={index < recentSessions.length - 1 ? styles.sectionDivider : undefined}>
                <Pressable style={styles.sessionRow} onPress={() => toggleSession(session.id)}>
                  <View style={styles.sessionMetaColumn}>
                    <Text style={styles.sessionName} numberOfLines={1}>
                      {session.name}
                    </Text>
                    <View style={styles.sessionSubtitleRow}>
                      <Text style={styles.sessionSubtitle}>{session.date}</Text>
                      <Text style={styles.sessionSubtitleDot}>·</Text>
                      <Text style={styles.sessionSubtitle}>{session.scanned} scanned</Text>
                    </View>
                  </View>

                  <View style={styles.sessionSummaryRow}>
                    <View style={styles.sessionSummaryTextWrap}>
                      <Text style={styles.sessionCountText}>{session.profitable}/{session.scanned}</Text>
                      <Text style={[styles.sessionRateText, rate >= 60 && styles.sessionRateTextActive]}>
                        {rate}% win
                      </Text>
                    </View>
                    <ChevronDown
                      size={16}
                      color={colors.textFaint}
                      strokeWidth={2}
                      style={isOpen ? styles.chevronOpen : undefined}
                    />
                  </View>
                </Pressable>

                {isOpen ? (
                  <View style={styles.expandedWrap}>
                    <View style={styles.tableHeadRow}>
                      <Text style={styles.tableHeadText}>Product</Text>
                      <Text style={[styles.tableHeadText, styles.tableHeadNumeric]}>Margin</Text>
                      <Text style={[styles.tableHeadText, styles.tableHeadNumeric]}>Pop.</Text>
                    </View>

                    {session.winningProducts.map((product, productIndex) => (
                      <Pressable
                        key={product.id}
                        style={[
                          styles.productRow,
                          productIndex < session.winningProducts.length - 1 && styles.productRowDivider,
                        ]}
                        onPress={() =>
                          router.push(`/session/${session.sessionId}/product/${product.id}`)
                        }
                      >
                        <View style={styles.productCopyWrap}>
                          <Text style={styles.productTitle} numberOfLines={1}>
                            {product.title}
                          </Text>
                          <Text style={styles.productTrail}>
                            ${product.foundPrice.toFixed(2)}
                            <Text style={styles.productTrailArrow}> → </Text>
                            ${product.price.toFixed(2)}
                          </Text>
                        </View>

                        <Text style={styles.productMarginText}>{getMargin(product).toFixed(0)}%</Text>
                        <Text style={styles.productPopularityText}>
                          {product.sellerPopularityScore.toLocaleString()}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <ResyncAllModal
        visible={showResyncModal}
        productNames={allProductNames}
        onClose={() => setShowResyncModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48.5%',
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    padding: 16,
    ...shadows.soft,
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    flex: 1,
    paddingRight: 8,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    marginBottom: 4,
  },
  statSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statSub: {
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
  sectionCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    padding: 16,
    ...shadows.soft,
  },
  sectionCardNoPadding: {
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
    ...shadows.soft,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  },
  categoryList: {
    gap: 14,
    marginTop: 16,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  categoryName: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    flex: 1,
  },
  categoryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryMeta: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
  },
  categoryMargin: {
    color: colors.accent,
    fontSize: font.sizeXs,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: '#3f3f46',
    overflow: 'hidden',
  },
  progressFillAmber: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sessionMetaColumn: {
    flex: 1,
    minWidth: 0,
  },
  sessionName: {
    color: '#e4e4e7',
    fontSize: font.sizeXs,
  },
  sessionSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  sessionSubtitle: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  sessionSubtitleDot: {
    color: colors.textFaint,
    fontSize: 11,
  },
  sessionSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionSummaryTextWrap: {
    alignItems: 'flex-end',
  },
  sessionCountText: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
  },
  sessionRateText: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 2,
  },
  sessionRateTextActive: {
    color: colors.accent,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  expandedWrap: {
    backgroundColor: 'rgba(9, 9, 11, 0.35)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tableHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeadText: {
    flex: 1,
    color: colors.textFaint,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tableHeadNumeric: {
    flex: 0,
    width: 56,
    textAlign: 'right',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productCopyWrap: {
    flex: 1,
    minWidth: 0,
  },
  productTitle: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
  },
  productTrail: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 4,
  },
  productTrailArrow: {
    color: colors.textFaint,
  },
  productMarginText: {
    width: 56,
    color: colors.accent,
    fontSize: font.sizeXs,
    textAlign: 'right',
  },
  productPopularityText: {
    width: 56,
    color: colors.textMuted,
    fontSize: font.sizeXs,
    textAlign: 'right',
  },
});
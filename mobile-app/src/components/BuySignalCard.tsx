import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, Gauge, Info } from 'lucide-react-native';
import { colors, font, radius } from '../constants/theme';
import type { CompetitionLevel, SellerPopularity } from '../types/product';

export interface ProductSignalData {
  profitMargin: number;
  foundPrice: number;
  sellerPopularity: SellerPopularity;
  competitionLevel: CompetitionLevel;
  monthlySalesEstimate: number;
  requiresApproval: boolean;
  restrictions: string[];
  category: string;
  weight: string;
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function computeScore(p: ProductSignalData): number {
  let score = 0;

  const marginPct = (p.profitMargin / p.foundPrice) * 100;
  score += Math.min(35, Math.max(0, (marginPct / 25) * 35));

  const popPts = { Low: 0, Medium: 10, High: 20, 'Very High': 25 } as const;
  score += popPts[p.sellerPopularity];

  const compPts = { Low: 20, Medium: 12, High: 5, 'Very High': 0 } as const;
  score += compPts[p.competitionLevel];

  score += Math.min(15, (p.monthlySalesEstimate / 600) * 15);

  if (p.requiresApproval) score -= 5;
  score -= Math.min(p.restrictions.length * 5, 10);

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Verdict ──────────────────────────────────────────────────────────────────

interface Verdict {
  label: string;
  color: string;
  bg: string;
  border: string;
  solid: string;
}

function getVerdict(score: number): Verdict {
  if (score >= 82)
    return {
      label: 'Strong Buy',
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.10)',
      border: 'rgba(52, 211, 153, 0.25)',
      solid: '#34d399',
    };
  if (score >= 64)
    return {
      label: 'Buy',
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.10)',
      border: 'rgba(52, 211, 153, 0.25)',
      solid: '#34d399',
    };
  if (score >= 46)
    return {
      label: 'Lean Buy',
      color: '#facc15',
      bg: 'rgba(250, 204, 21, 0.10)',
      border: 'rgba(250, 204, 21, 0.25)',
      solid: '#facc15',
    };
  if (score >= 30)
    return {
      label: 'Neutral',
      color: '#facc15',
      bg: 'rgba(250, 204, 21, 0.10)',
      border: 'rgba(250, 204, 21, 0.25)',
      solid: '#facc15',
    };
  return {
    label: 'Avoid',
    color: '#f87171',
    bg: 'rgba(248, 113, 113, 0.10)',
    border: 'rgba(248, 113, 113, 0.25)',
    solid: '#f87171',
  };
}

// ── Watch Items ──────────────────────────────────────────────────────────────

interface WatchItem {
  text: string;
  level: 'warn' | 'risk';
}

function computeWatch(p: ProductSignalData): WatchItem[] {
  const out: WatchItem[] = [];
  const marginPct = (p.profitMargin / p.foundPrice) * 100;

  if (p.competitionLevel === 'Medium')
    out.push({ text: 'Moderate competition — monitor price erosion', level: 'warn' });
  else if (p.competitionLevel === 'High')
    out.push({ text: 'High competition — margin pressure likely', level: 'risk' });
  else if (p.competitionLevel === 'Very High')
    out.push({ text: 'Saturated market — extremely high competition', level: 'risk' });

  if (p.sellerPopularity === 'Low')
    out.push({ text: 'Low demand — risk of slow sell-through', level: 'risk' });
  else if (p.sellerPopularity === 'Medium')
    out.push({ text: 'Moderate demand — monitor velocity', level: 'warn' });

  if (p.category === 'Electronics')
    out.push({ text: 'High return rates typical for electronics', level: 'warn' });
  if (p.category === 'Toys')
    out.push({ text: 'Seasonal demand — velocity may fluctuate', level: 'warn' });
  if (p.category === 'Grocery')
    out.push({ text: 'Expiry risk — high inventory turnover required', level: 'risk' });

  if (p.restrictions.length > 0)
    out.push({ text: 'Compliance documentation required for listing', level: 'warn' });

  if (p.requiresApproval)
    out.push({ text: 'Category gating — requires prior approval', level: 'risk' });

  const weightNum = Number.parseFloat(p.weight);
  if (!Number.isNaN(weightNum) && weightNum > 0.4)
    out.push({ text: 'Heavier item — elevated FBA cost tiers', level: 'warn' });

  if (marginPct < 8)
    out.push({ text: 'Thin margin — sensitive to fee adjustments', level: 'risk' });

  return out;
}

// ── Component ────────────────────────────────────────────────────────────────

export function BuySignalCard({ product }: Readonly<{ product: ProductSignalData }>) {
  const score = computeScore(product);
  const verdict = getVerdict(score);
  const watchItems = computeWatch(product);

  return (
    <View style={styles.card}>
      <View style={[styles.accentLine, { backgroundColor: 'rgba(245, 158, 11, 0.40)' }]} />

      <View style={styles.body}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <Gauge size={14} color={colors.accent} strokeWidth={1.75} />
            </View>
            <Text style={styles.headerTitle}>Buy Signal</Text>
          </View>
          <View style={[styles.verdictBadge, { backgroundColor: verdict.bg, borderColor: verdict.border }]}>
            <Text style={[styles.verdictText, { color: verdict.color }]}>{verdict.label}</Text>
          </View>
        </View>

        {/* Meter */}
        <View style={styles.meterWrap}>
          <View style={styles.meterTrack}>
            <View style={[styles.meterFill, { width: `${score}%`, backgroundColor: verdict.solid }]} />
          </View>
          <View style={styles.meterLabelRow}>
            <Text style={styles.meterScore}>{score}</Text>
            <Text style={styles.meterMax}>/100</Text>
          </View>
        </View>

        {/* Watch Out */}
        <View style={styles.watchSection}>
          <Text style={styles.sectionLabel}>WATCH OUT</Text>
          {watchItems.length > 0 ? (
            watchItems.map((item) => (
              <View
                key={item.text}
                style={[
                  styles.watchItem,
                  {
                    borderColor:
                      item.level === 'risk'
                        ? 'rgba(248, 113, 113, 0.10)'
                        : 'rgba(250, 204, 21, 0.10)',
                  },
                ]}
              >
                <View
                  style={[
                    styles.watchDot,
                    {
                      backgroundColor:
                        item.level === 'risk'
                          ? 'rgba(248, 113, 113, 0.10)'
                          : 'rgba(250, 204, 21, 0.10)',
                    },
                  ]}
                >
                  {item.level === 'risk' ? (
                    <AlertTriangle size={10} color="#f87171" strokeWidth={2} />
                  ) : (
                    <Info size={10} color="#facc15" strokeWidth={2} />
                  )}
                </View>
                <Text style={styles.watchText}>{item.text}</Text>
              </View>
            ))
          ) : (
            <View style={styles.watchEmpty}>
              <Text style={styles.watchEmptyText}>
                No significant risks identified for this product.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.50)',
    backgroundColor: 'rgba(39, 39, 42, 0.40)',
    overflow: 'hidden',
  },
  accentLine: {
    height: 2,
  },
  body: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: font.sizeSm,
  },
  verdictBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  verdictText: {
    fontSize: 11,
  },
  meterWrap: {
    marginBottom: 16,
  },
  meterTrack: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  meterLabelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginTop: 8,
  },
  meterScore: {
    color: colors.text,
    fontSize: 13,
    fontWeight: font.weightMedium,
  },
  meterMax: {
    color: colors.textFaint,
    fontSize: 13,
  },
  watchSection: {
    gap: 8,
    paddingBottom: 4,
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  watchItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.40)',
  },
  watchDot: {
    width: 16,
    height: 16,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  watchText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  watchEmpty: {
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(39, 39, 42, 0.50)',
    backgroundColor: 'rgba(9, 9, 11, 0.20)',
    alignItems: 'center',
  },
  watchEmptyText: {
    color: colors.textFaint,
    fontSize: 11,
    fontStyle: 'italic',
  },
});

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ChevronDown,
  Clock,
  Info,
  Shield,
  Target,
  TrendingDown,
  Zap,
} from 'lucide-react-native';
import { colors, font, radius } from '../constants/theme';

type Confidence = 'Low' | 'Medium' | 'High';

const confidenceCfg: Record<Confidence, { color: string; bg: string; border: string }> = {
  Low: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.10)', border: 'rgba(248, 113, 113, 0.20)' },
  Medium: {
    color: '#facc15',
    bg: 'rgba(250, 204, 21, 0.10)',
    border: 'rgba(250, 204, 21, 0.20)',
  },
  High: {
    color: '#34d399',
    bg: 'rgba(52, 211, 153, 0.10)',
    border: 'rgba(52, 211, 153, 0.20)',
  },
};

const outcomes = [
  {
    key: 'fast',
    label: 'Fast sale',
    prob: 30,
    profit: '+$12',
    days: '< 7 days',
    barColor: 'rgba(52, 211, 153, 0.65)',
    textColor: '#34d399',
    dot: '#34d399',
  },
  {
    key: 'slow',
    label: 'Slow sale',
    prob: 50,
    profit: '+$6',
    days: '7–30 days',
    barColor: 'rgba(250, 204, 21, 0.65)',
    textColor: '#facc15',
    dot: '#facc15',
  },
  {
    key: 'liquidation',
    label: 'Liquidation',
    prob: 20,
    profit: '−$8',
    days: '30+ days',
    barColor: 'rgba(248, 113, 113, 0.65)',
    textColor: '#f87171',
    dot: '#f87171',
  },
] as const;

const riskMetrics = [
  { icon: Shield, label: 'Risk Score', value: '1.25', sub: 'Return vs volatility' },
  { icon: TrendingDown, label: 'Downside', value: '$1.60', sub: 'Expected loss risk' },
  { icon: Target, label: 'Break-even', value: '78%', sub: 'Probability' },
] as const;

const glossary = [
  {
    term: 'Expected Value',
    def: 'Probability-weighted average profit across all three sale scenarios.',
  },
  {
    term: 'Risk Score',
    def: 'Expected return divided by outcome volatility — higher is better.',
  },
  {
    term: 'Downside Exposure',
    def: 'Expected loss in worst-case scenarios, weighted by their probability.',
  },
] as const;

export function ProfitOutlookCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const confidence: Confidence = 'Medium';
  const cfg = confidenceCfg[confidence];

  return (
    <View style={styles.card}>
      <View style={styles.accentLine} />

      <View style={styles.body}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.iconWrap}>
              <Target size={14} color={colors.accent} strokeWidth={1.75} />
            </View>
            <Text style={styles.headerTitle}>Profit Outlook</Text>
            <Pressable
              style={[styles.infoBubble, showInfo && styles.infoBubbleActive]}
              onPress={() => setShowInfo((v) => !v)}
            >
              <Info size={12} color={colors.textFaint} strokeWidth={2} />
            </Pressable>
          </View>
          <Pressable
            style={styles.detailsButton}
            onPress={() => setIsExpanded((v) => !v)}
          >
            <Text style={styles.detailsButtonText}>
              {isExpanded ? 'Less' : 'Details'}
            </Text>
            <ChevronDown
              size={14}
              color={colors.textFaint}
              strokeWidth={2}
              style={isExpanded ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
          </Pressable>
        </View>

        {/* Info Glossary */}
        {showInfo && (
          <View style={styles.glossaryCard}>
            {glossary.map(({ term, def }) => (
              <View key={term} style={styles.glossaryItem}>
                <Text style={styles.glossaryTerm}>{term}</Text>
                <Text style={styles.glossaryDef}>{def}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Expected Value (hero) */}
        <View style={styles.heroRow}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroValue}>
              +$5.00<Text style={styles.heroUnit}> / unit</Text>
            </Text>
            <Text style={styles.heroSub}>
              Expected Value · Probability-weighted profit
            </Text>
          </View>
          <View
            style={[
              styles.confidenceBadge,
              { backgroundColor: cfg.bg, borderColor: cfg.border },
            ]}
          >
            <Text style={[styles.confidenceText, { color: cfg.color }]}>
              {confidence} confidence
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Outcome Distribution */}
        <View style={styles.outcomeSection}>
          <Text style={styles.sectionLabel}>OUTCOME DISTRIBUTION</Text>
          <View style={styles.barRow}>
            {outcomes.map((o) => (
              <View
                key={o.key}
                style={[styles.barSegment, { flex: o.prob, backgroundColor: o.barColor }]}
              />
            ))}
          </View>
          <View style={styles.outcomeLabelRow}>
            {outcomes.map((o, i) => (
              <View
                key={o.key}
                style={[
                  styles.outcomeLabel,
                  i === 1 && styles.outcomeLabelCenter,
                  i === 2 && styles.outcomeLabelRight,
                ]}
              >
                <Text style={styles.outcomeName}>{o.label}</Text>
                <Text style={[styles.outcomeProfit, { color: o.textColor }]}>{o.profit}</Text>
                <Text style={styles.outcomeProb}>{o.prob}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Risk Metrics */}
        <View style={styles.riskGrid}>
          {riskMetrics.map(({ icon: Icon, label, value, sub }) => (
            <View key={label} style={styles.riskTile}>
              <View style={styles.riskTileHeader}>
                <Icon size={12} color={colors.textFaint} strokeWidth={2} />
                <Text style={styles.riskTileLabel} numberOfLines={1}>
                  {label}
                </Text>
              </View>
              <Text style={styles.riskTileValue}>{value}</Text>
              <Text style={styles.riskTileSub}>{sub}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Velocity */}
        <View style={styles.velocityRow}>
          <View style={styles.velocityItem}>
            <Zap size={14} color={colors.textFaint} strokeWidth={2} />
            <View>
              <Text style={styles.velocityLabel}>Est. Sales / Day</Text>
              <Text style={styles.velocityValue}>4.2</Text>
            </View>
          </View>
          <View style={styles.velocityItem}>
            <Clock size={14} color={colors.textFaint} strokeWidth={2} />
            <View>
              <Text style={styles.velocityLabel}>Median Time to Sell</Text>
              <Text style={styles.velocityValue}>6 days</Text>
            </View>
          </View>
        </View>

        {/* Expanded Detail */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            <Text style={styles.sectionLabel}>SCENARIO DETAIL</Text>
            <View style={styles.scenarioList}>
              {outcomes.map((o, i) => (
                <View
                  key={o.key}
                  style={[
                    styles.scenarioRow,
                    i < outcomes.length - 1 && styles.scenarioRowBorder,
                  ]}
                >
                  <View style={[styles.scenarioDot, { backgroundColor: o.dot }]} />
                  <View style={styles.scenarioMeta}>
                    <Text style={styles.scenarioLabel}>{o.label}</Text>
                    <Text style={styles.scenarioDays}>{o.days}</Text>
                  </View>
                  <View style={styles.scenarioValues}>
                    <Text style={[styles.scenarioProfit, { color: o.textColor }]}>
                      {o.profit}
                    </Text>
                    <Text style={styles.scenarioProb}>{o.prob}%</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* EV Calculation */}
            <View style={styles.evCard}>
              <Text style={styles.sectionLabel}>EV CALCULATION</Text>
              <Text style={styles.evFormula}>
                (0.30 × $12) + (0.50 × $6) + (0.20 × −$8)
              </Text>
              <Text style={styles.evFormula}>= $3.60 + $3.00 − $1.60</Text>
              <View style={styles.evResultRow}>
                <Text style={styles.evResult}>
                  = <Text style={{ color: '#34d399' }}>+$5.00 / unit</Text>
                </Text>
              </View>
            </View>

            {/* Bottom note */}
            <View style={styles.noteRow}>
              <View style={styles.noteDot} />
              <Text style={styles.noteText}>
                <Text style={{ color: colors.textMuted }}>Moderate Buy</Text> — Expected
                value exceeds the minimum return threshold. Monitor if daily sell velocity
                drops below 3.0 units.
              </Text>
            </View>
          </View>
        )}
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
    backgroundColor: 'rgba(245, 158, 11, 0.60)',
  },
  body: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  infoBubble: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBubbleActive: {
    backgroundColor: 'rgba(82, 82, 91, 0.60)',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsButtonText: {
    color: colors.textFaint,
    fontSize: 11,
  },
  glossaryCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(9, 9, 11, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.30)',
    borderRadius: radius.lg,
    padding: 12,
    gap: 10,
  },
  glossaryItem: {},
  glossaryTerm: {
    color: colors.textMuted,
    fontSize: 11,
  },
  glossaryDef: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  heroLeft: {
    flex: 1,
    minWidth: 0,
  },
  heroValue: {
    color: colors.text,
    fontSize: font.size2xl,
    lineHeight: 28,
  },
  heroUnit: {
    color: colors.textFaint,
    fontSize: font.sizeSm,
  },
  heroSub: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 4,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    marginTop: 2,
  },
  confidenceText: {
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(63, 63, 70, 0.40)',
    marginBottom: 16,
  },
  outcomeSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  barRow: {
    flexDirection: 'row',
    height: 14,
    borderRadius: radius.full,
    overflow: 'hidden',
    gap: 2,
    backgroundColor: 'rgba(9, 9, 11, 1)',
  },
  barSegment: {
    height: '100%',
  },
  outcomeLabelRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  outcomeLabel: {
    flex: 1,
  },
  outcomeLabelCenter: {
    alignItems: 'center',
  },
  outcomeLabelRight: {
    alignItems: 'flex-end',
  },
  outcomeName: {
    color: colors.textMuted,
    fontSize: 11,
  },
  outcomeProfit: {
    fontSize: font.sizeXs,
  },
  outcomeProb: {
    color: colors.textFaint,
    fontSize: 11,
  },
  riskGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  riskTile: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.50)',
    borderRadius: radius.lg,
    padding: 12,
  },
  riskTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  riskTileLabel: {
    color: colors.textFaint,
    fontSize: 10,
    flex: 1,
  },
  riskTileValue: {
    color: colors.text,
    fontSize: font.sizeSm,
  },
  riskTileSub: {
    color: colors.textFaint,
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
  velocityRow: {
    flexDirection: 'row',
    gap: 24,
  },
  velocityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  velocityLabel: {
    color: colors.textFaint,
    fontSize: 11,
    marginBottom: 2,
  },
  velocityValue: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
  },
  expandedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(63, 63, 70, 0.40)',
  },
  scenarioList: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.30)',
    overflow: 'hidden',
  },
  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  scenarioRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 63, 70, 0.30)',
  },
  scenarioDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scenarioMeta: {
    flex: 1,
    minWidth: 0,
  },
  scenarioLabel: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
  },
  scenarioDays: {
    color: colors.textFaint,
    fontSize: 11,
  },
  scenarioValues: {
    alignItems: 'flex-end',
  },
  scenarioProfit: {
    fontSize: font.sizeXs,
  },
  scenarioProb: {
    color: colors.textFaint,
    fontSize: 11,
  },
  evCard: {
    marginTop: 12,
    backgroundColor: 'rgba(9, 9, 11, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.30)',
    borderRadius: radius.lg,
    padding: 14,
  },
  evFormula: {
    color: colors.textFaint,
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  evResultRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(63, 63, 70, 0.40)',
  },
  evResult: {
    color: colors.text,
    fontSize: font.sizeXs,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
  },
  noteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#facc15',
    marginTop: 5,
  },
  noteText: {
    flex: 1,
    color: colors.textSubtle,
    fontSize: font.sizeXs,
    lineHeight: 20,
  },
});

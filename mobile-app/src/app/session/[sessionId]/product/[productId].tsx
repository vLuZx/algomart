import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  DollarSign,
  Package,
} from 'lucide-react-native';
import { colors, font, radius, shadows } from '../../../../constants/theme';
import { RatingStars } from '../../../../components/RatingStars';
import { useSessions } from '../../../../store/sessions';
import type { CompetitionLevel, SellerPopularity } from '../../../../types/product';

const popularityColors: Record<SellerPopularity, string> = {
  Low: colors.textSubtle,
  Medium: colors.info,
  High: colors.accent,
  'Very High': colors.success,
};

const competitionColors: Record<CompetitionLevel, string> = {
  Low: colors.success,
  Medium: colors.accent,
  High: colors.warning,
  'Very High': colors.danger,
};

function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getProfitColor(profitMargin: number) {
  if (profitMargin > 15) {
    return colors.success;
  }

  if (profitMargin > 8) {
    return colors.accent;
  }

  return colors.warning;
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string; productId: string }>();
  const sessionId = getRouteParam(params.sessionId);
  const productId = getRouteParam(params.productId);
  const { getProduct } = useSessions();
  const product = sessionId && productId ? getProduct(sessionId, productId) : undefined;

  if (!sessionId || !productId || !product) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <Pressable style={styles.backButton} onPress={() => router.replace('/')}>
          <ChevronLeft size={20} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.fallbackTitle}>Product not found</Text>
        <Text style={styles.fallbackSubtitle}>The product details are unavailable for this session.</Text>
      </SafeAreaView>
    );
  }

  const profitColor = getProfitColor(product.profitMargin);
  const profitPct = ((product.profitMargin / product.foundPrice) * 100).toFixed(1);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => router.replace(`/session/${sessionId}`)}>
            <ChevronLeft size={20} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.headerTitle}>Product Details</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <View style={styles.productHeaderWrap}>
            <View style={styles.productImageWrap}>
              <Image source={{ uri: product.image }} style={styles.productImage} />
            </View>

            <View style={styles.productInfoWrap}>
              <Text style={styles.productTitle}>{product.title}</Text>

              <View style={styles.ratingRow}>
                <RatingStars rating={product.rating} size={15} />
                <Text style={styles.ratingText}>
                  {product.rating.toFixed(1)} ({product.reviewCount.toLocaleString()})
                </Text>
              </View>

              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{product.category}</Text>
              </View>

              <View style={styles.approvalRow}>
                {product.requiresApproval ? (
                  <>
                    <AlertCircle size={16} color={colors.accent} strokeWidth={2.2} />
                    <Text style={styles.approvalWarningText}>Requires Approval</Text>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} color={colors.success} strokeWidth={2.2} />
                    <Text style={styles.approvalOkText}>No Approval Required</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <DollarSign size={16} color={colors.accent} strokeWidth={2.2} />
            <Text style={styles.sectionTitle}>Profit Analysis</Text>
          </View>

          <View style={styles.twoColumnGrid}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Amazon Price</Text>
              <Text style={styles.metricValue}>${product.price.toFixed(2)}</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Found Price</Text>
              <Text style={[styles.metricValue, { color: colors.accent }]}>${product.foundPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Est. Shipping</Text>
              <Text style={styles.metricValueSmall}>${product.estimatedShipping.toFixed(2)}</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Amazon Fees</Text>
              <Text style={styles.metricValueSmall}>${product.amazonFees.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.profitRow}>
            <Text style={styles.metricLabel}>Profit Margin</Text>
            <View style={styles.profitValueWrap}>
              <Text style={[styles.profitValue, { color: profitColor }]}>${product.profitMargin.toFixed(2)}</Text>
              <Text style={styles.profitPct}>({profitPct}%)</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <BarChart3 size={16} color={colors.info} strokeWidth={2.2} />
            <Text style={styles.sectionTitle}>Market Statistics</Text>
          </View>

          <View style={styles.twoColumnGrid}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Seller Popularity</Text>
              <Text style={[styles.metricValueSmall, { color: popularityColors[product.sellerPopularity] }]}>
                {product.sellerPopularity} ({product.sellerPopularityScore})
              </Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Competition</Text>
              <Text style={[styles.metricValueSmall, { color: competitionColors[product.competitionLevel] }]}>
                {product.competitionLevel}
              </Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>BSR</Text>
              <Text style={styles.metricValueSmall}>#{product.bsr.toLocaleString()}</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Category Rank</Text>
              <Text style={styles.metricValueSmall}>#{product.salesRank.toLocaleString()}</Text>
            </View>
            <View style={styles.metricBlockWide}>
              <Text style={styles.metricLabel}>Est. Monthly Sales</Text>
              <View style={styles.monthlySalesRow}>
                <Package size={14} color={colors.success} strokeWidth={2.2} />
                <Text style={styles.monthlySalesValue}>~{product.monthlySalesEstimate.toLocaleString()} units/month</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Package size={16} color={colors.textMuted} strokeWidth={2.2} />
            <Text style={styles.sectionTitle}>Specifications</Text>
          </View>

          <View style={styles.specBlock}>
            <Text style={styles.metricLabel}>Dimensions</Text>
            <Text style={styles.metricValueSmall}>{product.dimensions}</Text>
          </View>

          <View style={styles.specBlock}>
            <Text style={styles.metricLabel}>Weight</Text>
            <Text style={styles.metricValueSmall}>{product.weight}</Text>
          </View>
        </View>

        {product.restrictions.length > 0 ? (
          <View style={styles.restrictionCard}>
            <View style={styles.sectionTitleRow}>
              <AlertCircle size={16} color={colors.accent} strokeWidth={2.2} />
              <Text style={styles.sectionTitle}>Restrictions & Notes</Text>
            </View>

            {product.restrictions.map((restriction) => (
              <View key={restriction} style={styles.restrictionRow}>
                <Text style={styles.restrictionBullet}>•</Text>
                <Text style={styles.restrictionText}>{restriction}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.bg,
    ...shadows.soft,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: font.sizeLg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    padding: 16,
  },
  productHeaderWrap: {
    gap: 16,
  },
  productImageWrap: {
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    maxWidth: 280,
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.bgCard,
  },
  productInfoWrap: {
    gap: 10,
  },
  productTitle: {
    color: colors.text,
    fontSize: font.sizeMd,
    lineHeight: 24,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryBadgeText: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approvalOkText: {
    color: colors.success,
    fontSize: font.sizeXs,
  },
  approvalWarningText: {
    color: colors.accent,
    fontSize: font.sizeXs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
  },
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricBlock: {
    width: '47%',
  },
  metricBlockWide: {
    width: '100%',
  },
  metricLabel: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
    marginBottom: 4,
  },
  metricValue: {
    color: colors.textMuted,
    fontSize: font.sizeMd,
    fontWeight: font.weightMedium,
  },
  metricValueSmall: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  },
  profitRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profitValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  profitValue: {
    fontSize: 24,
    fontWeight: font.weightBold,
  },
  profitPct: {
    color: colors.textSubtle,
    fontSize: font.sizeXs,
  },
  monthlySalesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthlySalesValue: {
    color: colors.success,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  },
  specBlock: {
    marginBottom: 12,
  },
  restrictionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.bgPanel,
    padding: 16,
  },
  restrictionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  restrictionBullet: {
    color: colors.accent,
    fontSize: font.sizeSm,
  },
  restrictionText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: font.sizeSm,
    lineHeight: 20,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  fallbackTitle: {
    color: colors.text,
    fontSize: font.sizeLg,
    fontWeight: font.weightSemibold,
    marginTop: 24,
  },
  fallbackSubtitle: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
    marginTop: 8,
    textAlign: 'center',
  },
});
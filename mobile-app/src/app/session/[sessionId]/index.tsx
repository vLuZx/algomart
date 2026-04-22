import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowDownWideNarrow,
  Check,
  ChevronDown,
  ChevronLeft,
  PenLine,
  RefreshCw,
  ScanLine,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import { SafeAreaView as InsetsSafeAreaView } from 'react-native-safe-area-context';
import { ProductCard } from '../../../components/ProductCard';
import { GradientButton } from '../../../components/GradientButton';
import { ResyncAllModal } from '../../../components/ResyncAllModal';
import { colors, font, radius, shadows } from '../../../constants/theme';
import { useSessions } from '../../../store/sessions';
import type { SessionProduct } from '../../../types/product';

type SortOption =
  | 'signal-desc'
  | 'signal-asc'
  | 'profit-desc'
  | 'profit-asc'
  | 'price-desc'
  | 'price-asc';

const popularityLevels = ['Low', 'Medium', 'High', 'Very High'] as const;

const buySignalLevels = ['Strong Buy', 'Buy', 'Lean Buy', 'Neutral', 'Avoid'] as const;
type BuySignalLabel = (typeof buySignalLevels)[number];

const sortOptions: readonly { value: SortOption; label: string }[] = [
  { value: 'signal-desc', label: 'Buy Signal: High to Low' },
  { value: 'signal-asc',  label: 'Buy Signal: Low to High' },
  { value: 'profit-desc', label: 'Profit: High to Low' },
  { value: 'profit-asc',  label: 'Profit: Low to High' },
  { value: 'price-desc',  label: 'Price: High to Low' },
  { value: 'price-asc',   label: 'Price: Low to High' },
];

function getRouteParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getProfit(product: SessionProduct) {
  return product.price - product.foundPrice;
}

function computeSignalScore(product: SessionProduct): number {
  let score = 0;
  const marginPct = (product.profitMargin / product.foundPrice) * 100;
  score += Math.min(35, Math.max(0, (marginPct / 25) * 35));
  const popPts = { Low: 0, Medium: 10, High: 20, 'Very High': 25 } as const;
  score += popPts[product.sellerPopularity];
  const compPts = { Low: 20, Medium: 12, High: 5, 'Very High': 0 } as const;
  score += compPts[product.competitionLevel];
  score += Math.min(15, (product.monthlySalesEstimate / 600) * 15);
  if (product.requiresApproval) score -= 5;
  score -= Math.min(product.restrictions.length * 5, 10);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getSignalLabel(score: number): BuySignalLabel {
  if (score >= 82) return 'Strong Buy';
  if (score >= 64) return 'Buy';
  if (score >= 46) return 'Lean Buy';
  if (score >= 30) return 'Neutral';
  return 'Avoid';
}

function sortProducts(products: SessionProduct[], sortBy: SortOption) {
  const sorted = [...products];

  sorted.sort((left, right) => {
    const leftProfit = getProfit(left);
    const rightProfit = getProfit(right);

    switch (sortBy) {
      case 'signal-desc':
        return computeSignalScore(right) - computeSignalScore(left);
      case 'signal-asc':
        return computeSignalScore(left) - computeSignalScore(right);
      case 'profit-desc':
        return rightProfit - leftProfit;
      case 'profit-asc':
        return leftProfit - rightProfit;
      case 'price-desc':
        return right.price - left.price;
      case 'price-asc':
        return left.price - right.price;
      default:
        return 0;
    }
  });

  return sorted;
}

function ProductSeparator() {
  return <View style={{ height: 12 }} />;
}

export default function SessionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = getRouteParam(params.sessionId);
  const { getSession, getProducts, renameSession, deleteProduct, updateFoundPrice } = useSessions();
  const session = sessionId ? getSession(sessionId) : undefined;
  const products = useMemo(() => (sessionId ? getProducts(sessionId) : []), [sessionId, getProducts]);

  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(session?.title ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSignals, setSelectedSignals] = useState<BuySignalLabel[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('signal-desc');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [showResyncModal, setShowResyncModal] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))),
    [products],
  );

  const filteredProducts = useMemo(() => {
    let result = [...products];
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (product) =>
          product.title.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query),
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter((product) => selectedCategories.includes(product.category));
    }

    if (selectedSignals.length > 0) {
      result = result.filter((product) =>
        selectedSignals.includes(getSignalLabel(computeSignalScore(product))),
      );
    }

    return sortProducts(result, sortBy);
  }, [products, searchQuery, selectedCategories, selectedSignals, sortBy]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedCategories.length > 0 || selectedSignals.length > 0;

  const selectedSortLabel = sortOptions.find((option) => option.value === sortBy)?.label ?? 'Sort';
  const productNames = useMemo(() => products.map((product) => product.title), [products]);

  const listEmptyTitle = searchQuery.trim().length > 0 || hasActiveFilters ? 'No products found' : 'No products yet';
  const listEmptySubtitle =
    searchQuery.trim().length > 0 || hasActiveFilters
      ? 'Try a different search or clear a filter.'
      : 'Use Scan Products to add items to this session.';

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const toggleSignal = (signal: BuySignalLabel) => {
    setSelectedSignals((current) =>
      current.includes(signal)
        ? current.filter((item) => item !== signal)
        : [...current, signal],
    );
  };

  if (!sessionId || !session) {
    return (
      <InsetsSafeAreaView style={styles.fallbackContainer}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <Pressable style={styles.backButton} onPress={() => router.replace('/')}>
          <ChevronLeft size={20} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.fallbackTitle}>Session not found</Text>
        <Text style={styles.fallbackSubtitle}>The requested session could not be loaded.</Text>
      </InsetsSafeAreaView>
    );
  }

  const listHeader = (
    <View style={styles.controlsSection}>
      <View style={styles.ctaRow}>
        <GradientButton
          label="Scan Products"
          icon={<ScanLine size={16} color={colors.accentText} strokeWidth={2.5} />}
          onPress={() => router.push(`/session/${sessionId}/scan`)}
          style={styles.scanButtonWrap}
          contentStyle={styles.scanButtonContent}
        />

        <Pressable style={styles.resyncButton} onPress={() => setShowResyncModal(true)}>
          <RefreshCw size={16} color={colors.textMuted} strokeWidth={2.1} />
          <Text style={styles.resyncButtonText}>Resync All</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Search size={16} color={colors.textSubtle} strokeWidth={2.2} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products..."
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      <View style={styles.filterRow}>
        <Pressable
          style={[
            styles.filterButton,
            (showFilters || hasActiveFilters) && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilters((current) => !current)}
        >
          <SlidersHorizontal
            size={14}
            color={showFilters || hasActiveFilters ? colors.accent : colors.textMuted}
            strokeWidth={2.2}
          />
          <Text style={[styles.filterButtonText, (showFilters || hasActiveFilters) && styles.filterButtonTextActive]}>
            Filters
          </Text>
          {hasActiveFilters ? <View style={styles.filterDot} /> : null}
        </Pressable>

        <Pressable style={styles.sortButton} onPress={() => setSortModalVisible(true)}>
          <ArrowDownWideNarrow size={14} color={colors.textMuted} strokeWidth={2.2} />
          <Text style={styles.sortButtonText} numberOfLines={1}>
            {selectedSortLabel}
          </Text>
          <ChevronDown size={14} color={colors.textSubtle} strokeWidth={2.2} />
        </Pressable>
      </View>

      {showFilters ? (
        <View style={styles.filterPanel}>
          <View style={styles.filterGroup}>
            <View style={styles.filterLabelRow}>
              <Text style={styles.filterLabel}>Category</Text>
              {selectedCategories.length > 0 ? (
                <Pressable onPress={() => setSelectedCategories([])}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.chipWrap}>
              {categories.map((category) => {
                const selected = selectedCategories.includes(category);

                return (
                  <Pressable
                    key={category}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleCategory(category)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{category}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <View style={styles.filterLabelRow}>
              <Text style={styles.filterLabel}>Buy Signal</Text>
              {selectedSignals.length > 0 ? (
                <Pressable onPress={() => setSelectedSignals([])}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.chipWrap}>
              {buySignalLevels.map((signal) => {
                const selected = selectedSignals.includes(signal);

                return (
                  <Pressable
                    key={signal}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleSignal(signal)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{signal}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  const listEmpty = (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Search size={28} color={colors.textFaint} strokeWidth={1.8} />
      </View>
      <Text style={styles.emptyTitle}>{listEmptyTitle}</Text>
      <Text style={styles.emptySubtitle}>{listEmptySubtitle}</Text>
    </View>
  );

  return (
    <InsetsSafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.backButton} onPress={() => router.replace('/')}>
            <ChevronLeft size={20} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>

          {isRenaming ? (
            <View style={styles.renameWrap}>
              <TextInput
                value={renameValue}
                onChangeText={setRenameValue}
                style={styles.renameInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => {
                  const trimmed = renameValue.trim();
                  if (trimmed) {
                    renameSession(sessionId, trimmed);
                  }
                  setIsRenaming(false);
                }}
              />

              <Pressable
                style={styles.renameActionAmber}
                onPress={() => {
                  const trimmed = renameValue.trim();
                  if (trimmed) {
                    renameSession(sessionId, trimmed);
                  }
                  setIsRenaming(false);
                }}
              >
                <Check size={14} color={colors.accent} strokeWidth={2.4} />
              </Pressable>

              <Pressable
                style={styles.renameActionNeutral}
                onPress={() => {
                  setRenameValue(session.title);
                  setIsRenaming(false);
                }}
              >
                <X size={14} color={colors.textMuted} strokeWidth={2.4} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.titleWrap}>
              <Text style={styles.titleText} numberOfLines={1}>
                {session.title}
              </Text>
              <Pressable
                style={styles.renameButton}
                onPress={() => {
                  setRenameValue(session.title);
                  setIsRenaming(true);
                }}
              >
                <PenLine size={14} color={colors.textMuted} strokeWidth={2.2} />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            sessionId={sessionId}
            product={item}
            onDelete={(productId) => deleteProduct(sessionId, productId)}
            onUpdateFoundPrice={(productId, foundPrice) =>
              updateFoundPrice(sessionId, productId, foundPrice)
            }
          />
        )}
        ItemSeparatorComponent={ProductSeparator}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <Modal transparent visible={sortModalVisible} animationType="fade" onRequestClose={() => setSortModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSortModalVisible(false)}>
          <View style={styles.sortSheet}>
            <Text style={styles.sortTitle}>Sort Products</Text>
            {sortOptions.map((option) => {
              const selected = option.value === sortBy;

              return (
                <Pressable
                  key={option.value}
                  style={styles.sortOption}
                  onPress={() => {
                    setSortBy(option.value);
                    setSortModalVisible(false);
                  }}
                >
                  <Text style={[styles.sortOptionText, selected && styles.sortOptionTextSelected]}>
                    {option.label}
                  </Text>
                  {selected ? <Check size={16} color={colors.accent} strokeWidth={2.4} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      <ResyncAllModal
        visible={showResyncModal}
        productNames={productNames}
        onClose={() => setShowResyncModal(false)}
      />
    </InsetsSafeAreaView>
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
  headerTopRow: {
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
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleText: {
    flex: 1,
    color: colors.text,
    fontSize: font.sizeLg,
  },
  renameButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  renameInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.bgCard,
    color: colors.text,
    paddingHorizontal: 12,
    fontSize: font.sizeSm,
  },
  renameActionAmber: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameActionNeutral: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsSection: {
    paddingBottom: 18,
    gap: 14,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scanButtonWrap: {
    flex: 1,
  },
  scanButtonContent: {
    minHeight: 48,
  },
  resyncButton: {
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCardMuted,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.soft,
  },
  resyncButtonText: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 42,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCardMuted,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: font.sizeSm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCardMuted,
    paddingHorizontal: 12,
  },
  filterButtonActive: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
  },
  filterButtonText: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    fontWeight: font.weightSemibold,
  },
  filterButtonTextActive: {
    color: colors.accent,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCardMuted,
    paddingHorizontal: 12,
  },
  sortButtonText: {
    flex: 1,
    color: colors.text,
    fontSize: font.sizeXs,
  },
  filterPanel: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    padding: 14,
    gap: 14,
  },
  filterGroup: {
    gap: 10,
  },
  filterLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
    fontWeight: font.weightSemibold,
  },
  clearText: {
    color: colors.accent,
    fontSize: font.sizeXs,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: font.sizeXs,
  },
  chipTextSelected: {
    color: colors.accent,
    fontWeight: font.weightSemibold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 72,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...shadows.soft,
  },
  emptyTitle: {
    color: colors.textMuted,
    fontSize: font.sizeMd,
    fontWeight: font.weightMedium,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: colors.textFaint,
    fontSize: font.sizeSm,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.bgOverlay,
    justifyContent: 'flex-end',
    padding: 16,
  },
  sortSheet: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgStrong,
    paddingVertical: 12,
    ...shadows.card,
  },
  sortTitle: {
    color: colors.text,
    fontSize: font.sizeSm,
    fontWeight: font.weightSemibold,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  sortOption: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  sortOptionText: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
  },
  sortOptionTextSelected: {
    color: colors.text,
    fontWeight: font.weightSemibold,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
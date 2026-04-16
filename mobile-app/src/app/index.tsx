import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSessions } from '../store/sessions';
import { SessionCard } from '../components/SessionCard';
import { GradientButton } from '../components/GradientButton';
import { colors, font, gradients, radius, shadows } from '../constants/theme';
import type { Session } from '../types/session';

const SESSIONS_PER_PAGE = 10;

function ListSeparator() {
  return <View style={{ height: 10 }} />;
}

export default function SessionsScreen() {
  const { sessions, addSession, deleteSession } = useSessions();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFocused, setSearchFocused] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [draftSessionName, setDraftSessionName] = useState('');
  const [draftError, setDraftError] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) {
      return sessions;
    }

    return sessions.filter((session) => session.title.toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / SESSIONS_PER_PAGE));

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * SESSIONS_PER_PAGE;
    return filtered.slice(start, start + SESSIONS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const openCreateModal = () => {
    setDraftSessionName('');
    setDraftError('');
    setCreateVisible(true);
  };

  const handleDelete = (session: Session) => {
    deleteSession(session.id);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleCreateSession = () => {
    const trimmed = draftSessionName.trim();

    if (!trimmed) {
      setDraftError('Please enter a session name.');
      return;
    }

    addSession(trimmed);
    setCreateVisible(false);
  };

  const renderItem = ({ item }: { item: Session }) => (
    <SessionCard
      id={item.id}
      title={item.title}
      lastUpdated={item.updatedAt}
      productCount={item.productCount}
      onPress={(id) => router.push(`/session/${id}`)}
      onDelete={() => handleDelete(item)}
    />
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const half = 2;
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, currentPage + half);
    if (end - start < 4) {
      if (start === 1) end = Math.min(totalPages, start + 4);
      else start = Math.max(1, end - 4);
    }
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <View style={styles.pagination}>
        <Pressable
          style={({ pressed }) => [
            styles.pageBtn,
            currentPage === 1 && styles.pageBtnDisabled,
            pressed && currentPage !== 1 && styles.pageBtnPressed,
          ]}
          onPress={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={18} color={currentPage === 1 ? '#3f3f46' : '#a1a1aa'} strokeWidth={2} />
        </Pressable>

        <View style={styles.pageNumbers}>
          {pages.map((page) => (
            <Pressable
              key={page}
              style={({ pressed }) => [
                styles.pageNumBtn,
                pressed && page !== currentPage && styles.pageBtnPressed,
              ]}
              onPress={() => goToPage(page)}
            >
              {page === currentPage ? (
                <LinearGradient colors={gradients.amber} style={styles.pageNumBtnActive}>
                  <Text style={styles.pageNumTextActive}>{page}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.pageNumText}>{page}</Text>
              )}
            </Pressable>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.pageBtn,
            currentPage === totalPages && styles.pageBtnDisabled,
            pressed && currentPage !== totalPages && styles.pageBtnPressed,
          ]}
          onPress={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight size={18} color={currentPage === totalPages ? '#3f3f46' : '#a1a1aa'} strokeWidth={2} />
        </Pressable>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Search size={32} color={colors.textFaint} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>{searchQuery ? 'No sessions found' : 'No sessions yet'}</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try a different search term' : 'Tap New to create your first session'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.heading}>Sessions</Text>
          <GradientButton
            label="New"
            icon={<Plus size={18} color={colors.accentText} strokeWidth={2.5} />}
            onPress={openCreateModal}
            style={styles.newButtonWrap}
            contentStyle={styles.newButtonContent}
          />
        </View>

        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Search size={18} color={colors.textSubtle} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sessions..."
            placeholderTextColor={colors.textSubtle}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
        </View>
      </View>

      <FlatList
        data={paginated}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderPagination}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ListSeparator}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      <Modal transparent visible={createVisible} animationType="fade" onRequestClose={() => setCreateVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.dialog}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>New Session</Text>
              <Text style={styles.dialogSubtitle}>Enter a name for this session</Text>
            </View>

            <View style={styles.dialogBody}>
              <TextInput
                value={draftSessionName}
                onChangeText={(value) => {
                  setDraftSessionName(value);
                  if (draftError) {
                    setDraftError('');
                  }
                }}
                placeholder="Spring Collection 2026"
                placeholderTextColor={colors.textFaint}
                style={styles.dialogInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreateSession}
              />
              {draftError ? <Text style={styles.errorText}>{draftError}</Text> : null}
            </View>

            <View style={styles.dialogFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setCreateVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <GradientButton label="Create" onPress={handleCreateSession} style={styles.createButtonWrap} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    ...shadows.soft,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heading: {
    fontSize: font.size2xl,
    fontWeight: font.weightNormal,
    color: colors.text,
    letterSpacing: -0.3,
  },
  newButtonWrap: {
    minWidth: 98,
  },
  newButtonContent: {
    minHeight: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bgInput,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadows.soft,
  },
  searchBarFocused: {
    borderColor: colors.accentBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    height: '100%',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadows.soft,
  },
  emptyTitle: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: font.weightMedium,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 24,
    paddingBottom: 8,
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.soft,
  },
  pageBtnDisabled: {
    opacity: 0.3,
  },
  pageBtnPressed: {
    backgroundColor: '#3f3f46',
  },
  pageNumBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.soft,
  },
  pageNumText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: font.weightMedium,
  },
  pageNumTextActive: {
    color: colors.accentText,
    fontWeight: font.weightBold,
  },
  pageNumBtnActive: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.bgOverlay,
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgStrong,
    overflow: 'hidden',
    ...shadows.card,
  },
  dialogHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  dialogTitle: {
    color: colors.text,
    fontSize: font.sizeLg,
    fontWeight: font.weightSemibold,
  },
  dialogSubtitle: {
    color: colors.textSubtle,
    fontSize: font.sizeSm,
    marginTop: 4,
  },
  dialogBody: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  dialogInput: {
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgCard,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: font.sizeMd,
  },
  errorText: {
    color: colors.danger,
    fontSize: font.sizeXs,
    marginTop: 8,
  },
  dialogFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.lg,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
  },
  createButtonWrap: {
    flex: 1,
  },
});

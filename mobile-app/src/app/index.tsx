/**
 * Sessions Screen — ported from Figma design
 * Dark zinc theme with amber accents, lucide icons, pagination + search.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useSessions } from '../store/sessions';
import { SessionCard } from '../components/SessionCard';
import type { Session } from '../types/session';

const SESSIONS_PER_PAGE = 10;

export default function SessionsScreen() {
  const { sessions, addSession, deleteSession } = useSessions();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFocused, setSearchFocused] = useState(false);

  // ── Filter + paginate ──────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / SESSIONS_PER_PAGE));

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * SESSIONS_PER_PAGE;
    return filtered.slice(start, start + SESSIONS_PER_PAGE);
  }, [filtered, currentPage]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleNewSession = () => {
    Alert.prompt(
      'New Session',
      'Enter a name for this session',
      (name) => {
        const trimmed = name?.trim();
        if (trimmed) addSession(trimmed);
      },
      'plain-text',
      '',
      'default',
    );
  };

  const handleDelete = (session: Session) => {
    Alert.alert(
      'Delete Session',
      `Delete "${session.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSession(session.id),
        },
      ],
    );
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // ── Render helpers ────────────────────────────────────────────
  const renderItem = ({ item }: { item: Session }) => (
    <SessionCard
      id={item.id}
      title={item.title}
      lastUpdated={item.updatedAt}
      productCount={item.productCount}
      onPress={(id) => console.log('Open session:', id)}
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
                page === currentPage && styles.pageNumBtnActive,
                pressed && page !== currentPage && styles.pageBtnPressed,
              ]}
              onPress={() => goToPage(page)}
            >
              <Text style={[styles.pageNumText, page === currentPage && styles.pageNumTextActive]}>
                {page}
              </Text>
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
        <Search size={32} color="#3f3f46" strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No sessions found' : 'No sessions yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Try a different search term'
          : 'Tap "+ New" to create your first session'}
      </Text>
    </View>
  );

  // ── Layout ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#18181b" />

      {/* Sticky header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.heading}>Sessions</Text>
          <Pressable
            style={({ pressed }) => [styles.newBtn, pressed && styles.newBtnPressed]}
            onPress={handleNewSession}
          >
            <Plus size={18} color="#18181b" strokeWidth={2.5} />
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Search size={18} color="#71717a" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sessions..."
            placeholderTextColor="#71717a"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Sessions list */}
      <FlatList
        data={paginated}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderPagination}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18181b',
  },

  // ── Header ────────────────────────────────────────────────────
  header: {
    backgroundColor: '#18181b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39, 39, 42, 0.5)',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: '400',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  newBtnPressed: {
    backgroundColor: '#d97706',
    transform: [{ scale: 0.96 }],
  },
  newBtnText: {
    color: '#18181b',
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Search ────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  searchBarFocused: {
    borderColor: 'rgba(217, 119, 6, 0.4)',
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    height: '100%',
  },

  // ── List ──────────────────────────────────────────────────────
  listContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },

  // ── Empty state ───────────────────────────────────────────────
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    color: '#a1a1aa',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#52525b',
    fontSize: 13,
    textAlign: 'center',
  },

  // ── Pagination ────────────────────────────────────────────────
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
    borderRadius: 8,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
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
    borderRadius: 8,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  pageNumBtnActive: {
    backgroundColor: '#f59e0b',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  pageNumText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '500',
  },
  pageNumTextActive: {
    color: '#18181b',
    fontWeight: '700',
  },
});

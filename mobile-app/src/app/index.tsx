/**
 * Session Select Screen
 * Landing page - List all sessions and create new ones
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { PageHeader } from '../components/layout/PageHeader';
import { SessionCard } from '../components/session/SessionCard';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useSessions } from '../features/session/hooks/use-sessions';
import { tokens } from '../constants/tokens';

export default function SessionSelectScreen() {
  const router = useRouter();
  const { sessions, isLoading, createSession, deleteSession, updateSessionName } = useSessions();
  
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const handleCreateSession = () => {
    const sessionId = createSession();
    router.push(`/session/${sessionId}` as any);
  };

  const handleOpenSession = (sessionId: string) => {
    router.push(`/session/${sessionId}` as any);
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessionToDelete(sessionId);
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    await updateSessionName(sessionId, newName);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    
    try {
      await deleteSession(sessionToDelete);
      setSessionToDelete(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete session');
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader 
        title="Algomart" 
        subtitle="Product Analysis Sessions"
      />

      <View style={styles.content}>
        <View style={styles.actionContainer}>
          <Button
            title="Start New Session"
            onPress={handleCreateSession}
            variant="primary"
            size="large"
            fullWidth
          />
        </View>

        <ScrollView 
          style={styles.sessionList}
          contentContainerStyle={styles.sessionListContent}
          showsVerticalScrollIndicator={false}
        >
          {sessions.length === 0 ? (
            <EmptyState
              title="No sessions yet"
              message="Start your first session to begin scanning products"
            />
          ) : (
            sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onPress={() => handleOpenSession(session.id)}
                onDelete={() => handleDeleteSession(session.id)}
                onRename={(newName) => handleRenameSession(session.id, newName)}
              />
            ))
          )}
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={sessionToDelete !== null}
        title="Delete Session"
        message="Are you sure you want to delete this session? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setSessionToDelete(null)}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  actionContainer: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.lg,
  },
  sessionList: {
    flex: 1,
    paddingHorizontal: tokens.spacing.lg,
  },
  sessionListContent: {
    paddingBottom: tokens.spacing.xl,
  },
});

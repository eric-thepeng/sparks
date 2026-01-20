/**
 * NotesContext - Notes state management
 * 
 * Features:
 * - Manage user notes for posts
 * - AsyncStorage local persistence
 * - Reserved backend API sync interface
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// Type Definitions
// ============================================================

/** Note data structure */
export interface Note {
  id: string;           // Unique note ID
  postUid: string;      // Associated post UID
  postTitle: string;    // Post title for display
  content: string;      // Note content
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
  // Backend sync related
  syncedToServer?: boolean;
  serverNoteId?: string;
}

/** Sync status */
export type NoteSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/** Context value type */
interface NotesContextValue {
  // State
  notes: Note[];
  isLoading: boolean;
  syncStatus: NoteSyncStatus;
  error: string | null;
  
  // Operations
  addNote: (postUid: string, postTitle: string, content: string) => Promise<Note>;
  updateNote: (noteId: string, content: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  getNotesForPost: (postUid: string) => Note[];
  hasNotesForPost: (postUid: string) => boolean;
  getNoteCount: () => number;
  clearAllNotes: () => Promise<void>;
  refreshNotes: () => Promise<void>;
  
  // Backend sync reserved interfaces
  syncToServer: () => Promise<void>;
  bindAccount: (userId: string, token: string) => Promise<void>;
}

// ============================================================
// Storage Keys
// ============================================================

const STORAGE_KEYS = {
  NOTES: '@sparks/notes',
  USER_ID: '@sparks/user_id',
  AUTH_TOKEN: '@sparks/auth_token',
  LAST_NOTES_SYNC: '@sparks/last_notes_sync',
};

// ============================================================
// Context Creation
// ============================================================

const NotesContext = createContext<NotesContextValue | undefined>(undefined);

// ============================================================
// Provider Component
// ============================================================

interface NotesProviderProps {
  children: ReactNode;
}

export function NotesProvider({ children }: NotesProviderProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<NoteSyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // User auth info (reserved)
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // ============================================================
  // Initialize - Load from local storage
  // ============================================================
  
  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.NOTES);
      if (stored) {
        const parsed: Note[] = JSON.parse(stored);
        // Sort by updated time (newest first)
        parsed.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setNotes(parsed);
      }
      
      // Load user auth info (reserved)
      const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (storedUserId) setUserId(storedUserId);
      if (storedToken) setAuthToken(storedToken);
      
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // Persist notes
  // ============================================================
  
  const persistNotes = async (notesData: Note[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notesData));
    } catch (err) {
      console.error('Failed to persist notes:', err);
      throw err;
    }
  };

  // ============================================================
  // Add note
  // ============================================================
  
  const addNote = useCallback(async (
    postUid: string, 
    postTitle: string, 
    content: string
  ): Promise<Note> => {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      postUid,
      postTitle,
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
      syncedToServer: false,
    };

    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    
    try {
      await persistNotes(updatedNotes);
      
      // If logged in, sync to server (reserved)
      if (userId && authToken) {
        syncSingleNote(newNote);
      }
      
      return newNote;
    } catch (err) {
      // Rollback
      setNotes(notes);
      setError('Failed to save note, please try again');
      throw err;
    }
  }, [notes, userId, authToken]);

  // ============================================================
  // Update note
  // ============================================================
  
  const updateNote = useCallback(async (noteId: string, content: string) => {
    const noteIndex = notes.findIndex(n => n.id === noteId);
    if (noteIndex === -1) return;

    const updatedNote = {
      ...notes[noteIndex],
      content: content.trim(),
      updatedAt: new Date().toISOString(),
      syncedToServer: false,
    };

    const updatedNotes = [...notes];
    updatedNotes[noteIndex] = updatedNote;
    
    // Re-sort by updated time
    updatedNotes.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    const previousNotes = notes;
    setNotes(updatedNotes);
    
    try {
      await persistNotes(updatedNotes);
    } catch (err) {
      setNotes(previousNotes);
      setError('Failed to update note, please try again');
    }
  }, [notes]);

  // ============================================================
  // Delete note
  // ============================================================
  
  const deleteNote = useCallback(async (noteId: string) => {
    const updatedNotes = notes.filter(n => n.id !== noteId);
    const previousNotes = notes;
    
    setNotes(updatedNotes);
    
    try {
      await persistNotes(updatedNotes);
      
      // If logged in, sync delete to server (reserved)
      if (userId && authToken) {
        deleteSyncedNote(noteId);
      }
    } catch (err) {
      setNotes(previousNotes);
      setError('Failed to delete note, please try again');
    }
  }, [notes, userId, authToken]);

  // ============================================================
  // Get notes for a specific post
  // ============================================================
  
  const getNotesForPost = useCallback((postUid: string): Note[] => {
    return notes.filter(n => n.postUid === postUid);
  }, [notes]);

  // ============================================================
  // Check if post has notes
  // ============================================================
  
  const hasNotesForPost = useCallback((postUid: string): boolean => {
    return notes.some(n => n.postUid === postUid);
  }, [notes]);

  // ============================================================
  // Get total note count
  // ============================================================
  
  const getNoteCount = useCallback((): number => {
    return notes.length;
  }, [notes]);

  // ============================================================
  // Clear all notes
  // ============================================================
  
  const clearAllNotes = useCallback(async () => {
    const previousNotes = notes;
    setNotes([]);
    
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.NOTES);
    } catch (err) {
      setNotes(previousNotes);
      setError('Failed to clear notes, please try again');
    }
  }, [notes]);

  // ============================================================
  // Refresh notes
  // ============================================================
  
  const refreshNotes = useCallback(async () => {
    await loadNotes();
  }, []);

  // ============================================================
  // Backend sync reserved interfaces
  // ============================================================
  
  /** Sync all local notes to server */
  const syncToServer = useCallback(async () => {
    if (!userId || !authToken) {
      console.log('User not authenticated, skip sync');
      return;
    }

    setSyncStatus('syncing');
    
    try {
      // TODO: Implement backend API call
      // const unsyncedNotes = notes.filter(n => !n.syncedToServer);
      // await api.syncNotes(userId, unsyncedNotes, authToken);
      
      // Simulate success
      const syncedNotes = notes.map(n => ({ ...n, syncedToServer: true }));
      setNotes(syncedNotes);
      await persistNotes(syncedNotes);
      
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_NOTES_SYNC, new Date().toISOString());
      setSyncStatus('synced');
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatus('error');
      setError('Sync failed, please check your network');
    }
  }, [userId, authToken, notes]);

  /** Bind user account */
  const bindAccount = useCallback(async (newUserId: string, newToken: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newUserId);
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
      setUserId(newUserId);
      setAuthToken(newToken);
    } catch (err) {
      console.error('Failed to bind account:', err);
      setError('Failed to bind account');
    }
  }, []);

  /** Sync single note (internal) */
  const syncSingleNote = async (note: Note) => {
    // TODO: Implement single note sync
    console.log('TODO: Sync single note to server:', note.id);
  };

  /** Delete synced note (internal) */
  const deleteSyncedNote = async (noteId: string) => {
    // TODO: Implement delete sync
    console.log('TODO: Delete synced note from server:', noteId);
  };

  // ============================================================
  // Context Value
  // ============================================================
  
  const value: NotesContextValue = {
    notes,
    isLoading,
    syncStatus,
    error,
    addNote,
    updateNote,
    deleteNote,
    getNotesForPost,
    hasNotesForPost,
    getNoteCount,
    clearAllNotes,
    refreshNotes,
    syncToServer,
    bindAccount,
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useNotes(): NotesContextValue {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}

// Export types
export type { NotesContextValue };


/**
 * useNotes Hook
 * 
 * Convenient API for notes operations
 * Reserved backend interface and account binding
 */

import { useCallback, useMemo } from 'react';
import { useNotes as useNotesContext, Note } from '../context/NotesContext';

// ============================================================
// Type Definitions
// ============================================================

interface UseNotesResult {
  // Notes list
  notes: Note[];
  noteCount: number;
  
  // State
  isLoading: boolean;
  isEmpty: boolean;
  error: string | null;
  
  // Operations
  add: (postUid: string, postTitle: string, content: string) => Promise<Note>;
  update: (noteId: string, content: string) => Promise<void>;
  remove: (noteId: string) => Promise<void>;
  getForPost: (postUid: string) => Note[];
  hasNotes: (postUid: string) => boolean;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ============================================================
// Hook Implementation
// ============================================================

export function useNotesHook(): UseNotesResult {
  const {
    notes,
    isLoading,
    error,
    addNote,
    updateNote,
    deleteNote,
    getNotesForPost,
    hasNotesForPost,
    getNoteCount,
    clearAllNotes,
    refreshNotes,
  } = useNotesContext();

  // Is empty
  const isEmpty = useMemo(() => notes.length === 0, [notes]);
  
  // Note count
  const noteCount = getNoteCount();

  return {
    notes,
    noteCount,
    isLoading,
    isEmpty,
    error,
    add: addNote,
    update: updateNote,
    remove: deleteNote,
    getForPost: getNotesForPost,
    hasNotes: hasNotesForPost,
    clearAll: clearAllNotes,
    refresh: refreshNotes,
  };
}

// ============================================================
// Backend sync related Hook (reserved)
// ============================================================

interface UseNotesSyncResult {
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncToServer: () => Promise<void>;
  bindAccount: (userId: string, token: string) => Promise<void>;
}

export function useNotesSync(): UseNotesSyncResult {
  const { syncStatus, syncToServer, bindAccount } = useNotesContext();
  
  return {
    syncStatus,
    syncToServer,
    bindAccount,
  };
}


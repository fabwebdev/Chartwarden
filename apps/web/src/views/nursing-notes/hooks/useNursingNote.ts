/**
 * Nursing Note CRUD Operations Hook
 *
 * Custom hook providing comprehensive CRUD operations for nursing clinical notes
 * with optimistic updates, error handling, and state management.
 *
 * Features:
 * - Create, read, update, delete operations
 * - Sign and update status functionality
 * - Filter and pagination support
 * - Optimistic updates for better UX
 * - Comprehensive error handling
 * - Loading states for all operations
 *
 * @example
 * const {
 *   note,
 *   notes,
 *   isLoading,
 *   createNote,
 *   updateNote,
 *   deleteNote,
 *   signNote,
 *   updateStatus
 * } = useNursingNote(patientId);
 */

import { useState, useCallback, useEffect } from 'react';
import http from 'hooks/useCookie';
import type {
  NursingClinicalNote,
  NursingClinicalNoteWithUsers,
  CreateNursingNoteInput,
  UpdateNursingNoteInput,
  SignNursingNoteInput,
  NursingNoteFilters,
  NursingNotePaginationParams,
  PaginatedNursingNotes,
  NursingNoteStatus
} from 'types/nursingNote';

// ==============================|| API ENDPOINTS ||============================== //

const API_BASE = '/patient/nursing-clinical-notes';

/**
 * API client functions for nursing notes
 */
const nursingNoteApi = {
  /**
   * Get all nursing notes with filters and pagination
   */
  getAll: async (filters?: NursingNoteFilters & NursingNotePaginationParams) => {
    const response = await http.get<PaginatedNursingNotes>(API_BASE, { params: filters });
    return response.data;
  },

  /**
   * Get nursing notes by patient ID
   */
  getByPatient: async (patientId: number, filters?: NursingNoteFilters & NursingNotePaginationParams) => {
    const response = await http.get<PaginatedNursingNotes>(`${API_BASE}/by-patient/${patientId}`, {
      params: filters
    });
    return response.data;
  },

  /**
   * Get nursing notes by nurse ID
   */
  getByNurse: async (nurseId: string, filters?: NursingNoteFilters & NursingNotePaginationParams) => {
    const response = await http.get<PaginatedNursingNotes>(`${API_BASE}/by-nurse/${nurseId}`, {
      params: filters
    });
    return response.data;
  },

  /**
   * Get unsigned notes
   */
  getUnsigned: async (filters?: NursingNotePaginationParams) => {
    const response = await http.get<PaginatedNursingNotes>(`${API_BASE}/unsigned`, {
      params: filters
    });
    return response.data;
  },

  /**
   * Get a single nursing note by ID
   */
  getById: async (id: number) => {
    const response = await http.get<{ data: NursingClinicalNoteWithUsers }>(`${API_BASE}/${id}`);
    return response.data.data;
  },

  /**
   * Create a new nursing note
   */
  create: async (data: CreateNursingNoteInput) => {
    const response = await http.post<{ data: NursingClinicalNote }>(API_BASE, data);
    return response.data.data;
  },

  /**
   * Update an existing nursing note
   */
  update: async (id: number, data: UpdateNursingNoteInput) => {
    const response = await http.put<{ data: NursingClinicalNote }>(`${API_BASE}/${id}`, data);
    return response.data.data;
  },

  /**
   * Partial update of a nursing note
   */
  patch: async (id: number, data: Partial<UpdateNursingNoteInput>) => {
    const response = await http.patch<{ data: NursingClinicalNote }>(`${API_BASE}/${id}`, data);
    return response.data.data;
  },

  /**
   * Store (create or update) nursing note
   */
  store: async (id: number, data: CreateNursingNoteInput | UpdateNursingNoteInput) => {
    const response = await http.post<{ data: NursingClinicalNote }>(`${API_BASE}/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete (soft delete) a nursing note
   */
  delete: async (id: number) => {
    const response = await http.delete<{ success: boolean; message: string }>(`${API_BASE}/${id}`);
    return response.data;
  },

  /**
   * Sign a nursing note
   */
  sign: async (id: number, signatureData: SignNursingNoteInput) => {
    const response = await http.post<{ data: NursingClinicalNote }>(`${API_BASE}/${id}/sign`, signatureData);
    return response.data.data;
  },

  /**
   * Update note status
   */
  updateStatus: async (id: number, status: NursingNoteStatus) => {
    const response = await http.patch<{ data: NursingClinicalNote }>(`${API_BASE}/${id}/status`, {
      noteStatus: status
    });
    return response.data.data;
  }
};

// ==============================|| HOOK ||============================== //

export interface UseNursingNoteOptions {
  patientId?: number;
  noteId?: number;
  nurseId?: string;
  filters?: NursingNoteFilters;
  pagination?: NursingNotePaginationParams;
  autoFetch?: boolean;
}

export interface UseNursingNoteResult {
  // State
  note: NursingClinicalNoteWithUsers | null;
  notes: NursingClinicalNote[];
  pagination: PaginatedNursingNotes['pagination'] | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;

  // CRUD operations
  fetchNote: (id: number) => Promise<NursingClinicalNoteWithUsers | null>;
  fetchNotes: (filters?: NursingNoteFilters & NursingNotePaginationParams) => Promise<void>;
  createNote: (data: CreateNursingNoteInput) => Promise<NursingClinicalNote | null>;
  updateNote: (id: number, data: UpdateNursingNoteInput) => Promise<NursingClinicalNote | null>;
  patchNote: (id: number, data: Partial<UpdateNursingNoteInput>) => Promise<NursingClinicalNote | null>;
  storeNote: (id: number, data: CreateNursingNoteInput | UpdateNursingNoteInput) => Promise<NursingClinicalNote | null>;
  deleteNote: (id: number) => Promise<boolean>;

  // Signature operations
  signNote: (id: number, signatureHash: string) => Promise<NursingClinicalNote | null>;
  updateStatus: (id: number, status: NursingNoteStatus) => Promise<NursingClinicalNote | null>;

  // Utility functions
  refreshNotes: () => Promise<void>;
  clearError: () => void;
  setNote: (note: NursingClinicalNoteWithUsers | null) => void;
}

/**
 * Custom hook for nursing note CRUD operations
 *
 * @param options - Configuration options for the hook
 * @returns Object containing state and CRUD operations
 */
export const useNursingNote = (options: UseNursingNoteOptions = {}): UseNursingNoteResult => {
  const {
    patientId,
    noteId,
    nurseId,
    filters: initialFilters,
    pagination: initialPagination,
    autoFetch = false
  } = options;

  // State
  const [note, setNote] = useState<NursingClinicalNoteWithUsers | null>(null);
  const [notes, setNotes] = useState<NursingClinicalNote[]>([]);
  const [pagination, setPagination] = useState<PaginatedNursingNotes['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ==============================|| FETCH OPERATIONS ||============================== //

  /**
   * Fetch a single nursing note by ID
   */
  const fetchNote = useCallback(async (id: number): Promise<NursingClinicalNoteWithUsers | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedNote = await nursingNoteApi.getById(id);
      setNote(fetchedNote);
      return fetchedNote;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch nursing note');
      setError(error);
      console.error('Error fetching nursing note:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch nursing notes with filters and pagination
   */
  const fetchNotes = useCallback(async (
    fetchFilters?: NursingNoteFilters & NursingNotePaginationParams
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const combinedFilters = {
        ...initialFilters,
        ...fetchFilters,
        ...(patientId && { patientId }),
        ...(nurseId && { nurseId })
      };

      const combinedPagination = {
        ...initialPagination,
        ...fetchFilters
      };

      let result: PaginatedNursingNotes;

      if (patientId) {
        result = await nursingNoteApi.getByPatient(patientId, {
          ...combinedFilters,
          ...combinedPagination
        });
      } else if (nurseId) {
        result = await nursingNoteApi.getByNurse(nurseId, {
          ...combinedFilters,
          ...combinedPagination
        });
      } else {
        result = await nursingNoteApi.getAll({
          ...combinedFilters,
          ...combinedPagination
        });
      }

      setNotes(result.data);
      setPagination(result.pagination);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch nursing notes');
      setError(error);
      console.error('Error fetching nursing notes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, nurseId, initialFilters, initialPagination]);

  /**
   * Refresh notes with current filters
   */
  const refreshNotes = useCallback(async (): Promise<void> => {
    await fetchNotes();
  }, [fetchNotes]);

  // ==============================|| CREATE OPERATION ||============================== //

  /**
   * Create a new nursing note
   */
  const createNote = useCallback(async (data: CreateNursingNoteInput): Promise<NursingClinicalNote | null> => {
    try {
      setIsSaving(true);
      setError(null);

      const createdNote = await nursingNoteApi.create(data);

      // Optimistically add to notes list
      setNotes(prevNotes => [createdNote, ...prevNotes]);

      return createdNote;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create nursing note');
      setError(error);
      console.error('Error creating nursing note:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // ==============================|| UPDATE OPERATIONS ||============================== //

  /**
   * Update an existing nursing note (full update)
   */
  const updateNote = useCallback(async (
    id: number,
    data: UpdateNursingNoteInput
  ): Promise<NursingClinicalNote | null> => {
    try {
      setIsSaving(true);
      setError(null);

      const updatedNote = await nursingNoteApi.update(id, data);

      // Optimistically update in notes list
      setNotes(prevNotes =>
        prevNotes.map(n => (n.id === id ? updatedNote : n))
      );

      // Update current note if it matches
      if (note?.id === id) {
        setNote({ ...note, ...updatedNote });
      }

      return updatedNote;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update nursing note');
      setError(error);
      console.error('Error updating nursing note:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [note]);

  /**
   * Partially update a nursing note
   */
  const patchNote = useCallback(async (
    id: number,
    data: Partial<UpdateNursingNoteInput>
  ): Promise<NursingClinicalNote | null> => {
    try {
      setIsSaving(true);
      setError(null);

      const updatedNote = await nursingNoteApi.patch(id, data);

      // Optimistically update in notes list
      setNotes(prevNotes =>
        prevNotes.map(n => (n.id === id ? updatedNote : n))
      );

      // Update current note if it matches
      if (note?.id === id) {
        setNote({ ...note, ...updatedNote });
      }

      return updatedNote;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to patch nursing note');
      setError(error);
      console.error('Error patching nursing note:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [note]);

  /**
   * Store (create or update) a nursing note
   */
  const storeNote = useCallback(async (
    id: number,
    data: CreateNursingNoteInput | UpdateNursingNoteInput
  ): Promise<NursingClinicalNote | null> => {
    try {
      setIsSaving(true);
      setError(null);

      const storedNote = await nursingNoteApi.store(id, data);

      // Optimistically update in notes list
      setNotes(prevNotes => {
        const existingIndex = prevNotes.findIndex(n => n.id === id);
        if (existingIndex >= 0) {
          // Update existing
          const updated = [...prevNotes];
          updated[existingIndex] = storedNote;
          return updated;
        } else {
          // Add new
          return [storedNote, ...prevNotes];
        }
      });

      // Update current note if it matches
      if (note?.id === id) {
        setNote({ ...note, ...storedNote });
      }

      return storedNote;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to store nursing note');
      setError(error);
      console.error('Error storing nursing note:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [note]);

  // ==============================|| DELETE OPERATION ||============================== //

  /**
   * Delete a nursing note (soft delete)
   */
  const deleteNote = useCallback(async (id: number): Promise<boolean> => {
    try {
      setIsSaving(true);
      setError(null);

      await nursingNoteApi.delete(id);

      // Optimistically remove from notes list
      setNotes(prevNotes => prevNotes.filter(n => n.id !== id));

      // Clear current note if it matches
      if (note?.id === id) {
        setNote(null);
      }

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete nursing note');
      setError(error);
      console.error('Error deleting nursing note:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [note]);

  // ==============================|| SIGNATURE OPERATIONS ||============================== //

  /**
   * Sign a nursing note
   */
  const signNote = useCallback(async (
    id: number,
    signatureHash: string
  ): Promise<NursingClinicalNote | null> => {
    try {
      setIsSaving(true);
      setError(null);

      const signedNote = await nursingNoteApi.sign(id, { signatureHash });

      // Optimistically update in notes list
      setNotes(prevNotes =>
        prevNotes.map(n => (n.id === id ? signedNote : n))
      );

      // Update current note if it matches
      if (note?.id === id) {
        setNote({ ...note, ...signedNote });
      }

      return signedNote;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to sign nursing note');
      setError(error);
      console.error('Error signing nursing note:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [note]);

  /**
   * Update nursing note status
   */
  const updateStatus = useCallback(async (
    id: number,
    status: NursingNoteStatus
  ): Promise<NursingClinicalNote | null> => {
    try {
      setIsSaving(true);
      setError(null);

      const updatedNote = await nursingNoteApi.updateStatus(id, status);

      // Optimistically update in notes list
      setNotes(prevNotes =>
        prevNotes.map(n => (n.id === id ? updatedNote : n))
      );

      // Update current note if it matches
      if (note?.id === id) {
        setNote({ ...note, ...updatedNote });
      }

      return updatedNote;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update note status');
      setError(error);
      console.error('Error updating note status:', err);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [note]);

  // ==============================|| UTILITY FUNCTIONS ||============================== //

  /**
   * Clear the error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==============================|| AUTO-FETCH ||============================== //

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      if (noteId) {
        fetchNote(noteId);
      } else {
        fetchNotes();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, noteId]);

  // ==============================|| RETURN ||============================== //

  return {
    // State
    note,
    notes,
    pagination,
    isLoading,
    isSaving,
    error,

    // CRUD operations
    fetchNote,
    fetchNotes,
    createNote,
    updateNote,
    patchNote,
    storeNote,
    deleteNote,

    // Signature operations
    signNote,
    updateStatus,

    // Utility functions
    refreshNotes,
    clearError,
    setNote
  };
};

// ==============================|| EXPORT ||============================== //

export default useNursingNote;

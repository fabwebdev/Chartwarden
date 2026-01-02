import { useEffect, useRef, useCallback, useState } from 'react';
import type { NursingNoteAutoSaveState } from 'types/nursingNote';

// ===========================|| HOOKS - AUTO SAVE ||=========================== //

/**
 * Configuration options for the auto-save hook
 */
interface UseAutoSaveOptions<T> {
  /**
   * Function to call when auto-saving
   * Should return a Promise that resolves when save is complete
   */
  onSave: (data: T) => Promise<void>;

  /**
   * Debounce delay in milliseconds
   * @default 30000 (30 seconds)
   */
  debounceMs?: number;

  /**
   * Whether auto-save is enabled
   * @default true
   */
  enabled?: boolean;

  /**
   * Callback when save succeeds
   */
  onSuccess?: () => void;

  /**
   * Callback when save fails
   */
  onError?: (error: Error) => void;
}

/**
 * Custom hook for auto-saving data with debouncing
 *
 * This hook automatically saves data after a period of inactivity,
 * preventing excessive API calls while ensuring data isn't lost.
 *
 * @template T - The type of data being saved
 * @param data - The data to auto-save
 * @param options - Configuration options
 * @returns Auto-save state including saving status and error information
 *
 * @example
 * ```tsx
 * const { isSaving, lastSaved, error, saveNow } = useAutoSave(noteData, {
 *   onSave: async (data) => {
 *     await updateNursingNote(data.id, data);
 *   },
 *   debounceMs: 30000, // 30 seconds
 *   onSuccess: () => toast.success('Auto-saved'),
 *   onError: (err) => toast.error('Auto-save failed')
 * });
 * ```
 */
export function useAutoSave<T>(
  data: T,
  options: UseAutoSaveOptions<T>
): NursingNoteAutoSaveState & { saveNow: () => Promise<void> } {
  const {
    onSave,
    debounceMs = 30000, // Default 30 seconds
    enabled = true,
    onSuccess,
    onError
  } = options;

  // State for tracking auto-save status
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isDirty, setIsDirty] = useState(false);

  // Refs to track state across renders
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<T>(data);
  const isMountedRef = useRef(true);
  const saveInProgressRef = useRef(false);

  /**
   * Performs the actual save operation
   */
  const performSave = useCallback(async () => {
    // Prevent concurrent saves
    if (saveInProgressRef.current || !enabled) {
      return;
    }

    saveInProgressRef.current = true;
    setIsSaving(true);
    setError(undefined);

    try {
      await onSave(data);

      if (isMountedRef.current) {
        setLastSaved(new Date());
        setIsDirty(false);
        previousDataRef.current = data;
        onSuccess?.();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Auto-save failed';

      if (isMountedRef.current) {
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      if (isMountedRef.current) {
        setIsSaving(false);
      }
      saveInProgressRef.current = false;
    }
  }, [data, enabled, onSave, onSuccess, onError]);

  /**
   * Manual save trigger
   * Cancels any pending debounced save and saves immediately
   */
  const saveNow = useCallback(async () => {
    // Cancel pending debounced save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    await performSave();
  }, [performSave]);

  /**
   * Effect to detect data changes and trigger debounced auto-save
   */
  useEffect(() => {
    // Skip if disabled or data hasn't changed
    if (!enabled || data === previousDataRef.current) {
      return;
    }

    // Mark as dirty when data changes
    setIsDirty(true);

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set up new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, enabled, debounceMs, performSave]);

  /**
   * Effect to handle component unmount
   * Clears timers and updates mounted ref
   */
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    noteId: undefined, // Will be set by parent component if needed
    isSaving,
    lastSaved,
    error,
    isDirty,
    saveNow
  };
}

/**
 * Hook for auto-saving with visibility API integration
 * Automatically saves when the page becomes hidden (user switches tabs/closes window)
 *
 * @template T - The type of data being saved
 * @param data - The data to auto-save
 * @param options - Configuration options
 * @returns Auto-save state and manual save trigger
 *
 * @example
 * ```tsx
 * const autoSave = useAutoSaveWithVisibility(noteData, {
 *   onSave: async (data) => await updateNote(data),
 *   debounceMs: 30000
 * });
 * ```
 */
export function useAutoSaveWithVisibility<T>(
  data: T,
  options: UseAutoSaveOptions<T>
) {
  const autoSave = useAutoSave(data, options);

  /**
   * Effect to save when page visibility changes
   * Ensures data is saved when user navigates away
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Save if page is becoming hidden and there are unsaved changes
      if (document.hidden && autoSave.isDirty && !autoSave.isSaving) {
        autoSave.saveNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoSave]);

  /**
   * Effect to save before page unload
   * Uses sendBeacon API for reliable background save
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // If there are unsaved changes, warn the user
      if (autoSave.isDirty && !autoSave.isSaving) {
        e.preventDefault();
        e.returnValue = '';

        // Attempt to save using saveNow
        // Note: This may not complete in time, but we try anyway
        autoSave.saveNow();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [autoSave]);

  return autoSave;
}

export default useAutoSave;

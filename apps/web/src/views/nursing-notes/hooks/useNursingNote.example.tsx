/**
 * Example Usage of useNursingNote Hook
 *
 * This file demonstrates various usage patterns for the nursing note CRUD hook.
 * These examples show best practices and common use cases.
 */

import React, { useState } from 'react';
import { useNursingNote } from './useNursingNote';
import type { CreateNursingNoteInput, UpdateNursingNoteInput } from 'types/nursingNote';

// ==============================|| EXAMPLE 1: BASIC USAGE ||============================== //

/**
 * Example 1: Basic usage - Fetch and display nursing notes for a patient
 */
export const BasicNursingNoteList: React.FC<{ patientId: number }> = ({ patientId }) => {
  const { notes, isLoading, error, fetchNotes } = useNursingNote({
    patientId,
    autoFetch: true // Automatically fetch notes on mount
  });

  if (isLoading) return <div>Loading notes...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Patient Nursing Notes</h2>
      <button onClick={() => fetchNotes()}>Refresh</button>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            {note.noteDate} - {note.noteStatus}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ==============================|| EXAMPLE 2: CREATE NOTE ||============================== //

/**
 * Example 2: Create a new nursing note
 */
export const CreateNursingNoteForm: React.FC<{ patientId: number }> = ({ patientId }) => {
  const { createNote, isSaving, error } = useNursingNote({ patientId });
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const noteData: CreateNursingNoteInput = {
      patientId,
      noteDate: new Date().toISOString().split('T')[0],
      content,
      contentFormat: 'html',
      subjective: 'Patient reports...',
      objective: 'Vital signs stable...',
      assessment: 'Patient condition...',
      plan: 'Continue current care plan...'
    };

    const newNote = await createNote(noteData);
    if (newNote) {
      console.log('Note created:', newNote.id);
      setContent(''); // Clear form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Create New Nursing Note</h3>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter note content..."
        disabled={isSaving}
      />
      {error && <div className="error">{error.message}</div>}
      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Create Note'}
      </button>
    </form>
  );
};

// ==============================|| EXAMPLE 3: UPDATE NOTE ||============================== //

/**
 * Example 3: Update an existing nursing note
 */
export const EditNursingNote: React.FC<{ noteId: number }> = ({ noteId }) => {
  const { note, updateNote, fetchNote, isSaving, isLoading } = useNursingNote({
    noteId,
    autoFetch: true
  });

  const [editedContent, setEditedContent] = useState('');

  React.useEffect(() => {
    if (note) {
      setEditedContent(note.content || '');
    }
  }, [note]);

  const handleSave = async () => {
    if (!note) return;

    const updateData: UpdateNursingNoteInput = {
      content: editedContent,
      noteStatus: 'IN_PROGRESS'
    };

    const updated = await updateNote(note.id, updateData);
    if (updated) {
      console.log('Note updated successfully');
    }
  };

  if (isLoading) return <div>Loading note...</div>;
  if (!note) return <div>Note not found</div>;

  return (
    <div>
      <h3>Edit Nursing Note</h3>
      <textarea
        value={editedContent}
        onChange={(e) => setEditedContent(e.target.value)}
        disabled={isSaving}
      />
      <button onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
      <button onClick={() => fetchNote(noteId)} disabled={isSaving}>
        Refresh
      </button>
    </div>
  );
};

// ==============================|| EXAMPLE 4: PATCH (PARTIAL UPDATE) ||============================== //

/**
 * Example 4: Partial update - Update only specific fields
 */
export const UpdateNoteStatus: React.FC<{ noteId: number }> = ({ noteId }) => {
  const { patchNote, isSaving } = useNursingNote();

  const handleStatusChange = async (status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED') => {
    // Partial update - only update the status
    const updated = await patchNote(noteId, {
      noteStatus: status
    });

    if (updated) {
      console.log('Status updated to:', status);
    }
  };

  return (
    <div>
      <h4>Update Status</h4>
      <button onClick={() => handleStatusChange('DRAFT')} disabled={isSaving}>
        Mark as Draft
      </button>
      <button onClick={() => handleStatusChange('IN_PROGRESS')} disabled={isSaving}>
        Mark as In Progress
      </button>
      <button onClick={() => handleStatusChange('COMPLETED')} disabled={isSaving}>
        Mark as Completed
      </button>
    </div>
  );
};

// ==============================|| EXAMPLE 5: SIGN NOTE ||============================== //

/**
 * Example 5: Sign a nursing note with digital signature
 */
export const SignNursingNote: React.FC<{ noteId: number }> = ({ noteId }) => {
  const { signNote, isSaving } = useNursingNote();

  const handleSign = async () => {
    // In a real application, you would generate a proper signature hash
    // This is just a simplified example
    const signatureData = {
      noteId,
      timestamp: new Date().toISOString(),
      userId: 'current-user-id'
    };

    // Generate SHA-256 hash (in real app, use proper crypto library)
    const signatureHash = btoa(JSON.stringify(signatureData));

    const signedNote = await signNote(noteId, signatureHash);
    if (signedNote) {
      console.log('Note signed successfully');
    }
  };

  return (
    <div>
      <button onClick={handleSign} disabled={isSaving}>
        {isSaving ? 'Signing...' : 'Sign Note'}
      </button>
    </div>
  );
};

// ==============================|| EXAMPLE 6: FILTERED LIST ||============================== //

/**
 * Example 6: Fetch notes with filters and pagination
 */
export const FilteredNursingNoteList: React.FC<{ patientId: number }> = ({ patientId }) => {
  const { notes, pagination, fetchNotes, isLoading } = useNursingNote({ patientId });
  const [currentPage, setCurrentPage] = useState(1);

  const loadPage = (page: number) => {
    fetchNotes({
      page,
      limit: 10,
      sortBy: 'noteDate',
      sortOrder: 'desc',
      noteStatus: ['COMPLETED', 'SIGNED']
    });
    setCurrentPage(page);
  };

  React.useEffect(() => {
    loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Completed Nursing Notes</h2>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            <strong>{note.noteDate}</strong> - {note.noteStatus}
            <p>{note.content?.substring(0, 100)}...</p>
          </li>
        ))}
      </ul>
      {pagination && (
        <div className="pagination">
          <button
            onClick={() => loadPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => loadPage(currentPage + 1)}
            disabled={currentPage === pagination.totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

// ==============================|| EXAMPLE 7: DELETE NOTE ||============================== //

/**
 * Example 7: Delete a nursing note with confirmation
 */
export const DeleteNursingNote: React.FC<{ noteId: number; onDeleted?: () => void }> = ({
  noteId,
  onDeleted
}) => {
  const { deleteNote, isSaving } = useNursingNote();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      const success = await deleteNote(noteId);
      if (success) {
        console.log('Note deleted successfully');
        onDeleted?.();
      }
    }
  };

  return (
    <button onClick={handleDelete} disabled={isSaving} className="delete-button">
      {isSaving ? 'Deleting...' : 'Delete Note'}
    </button>
  );
};

// ==============================|| EXAMPLE 8: AUTO-SAVE ||============================== //

/**
 * Example 8: Auto-save with debouncing (combine with useAutoSave hook)
 */
export const AutoSaveNursingNote: React.FC<{ noteId: number }> = ({ noteId }) => {
  const { storeNote, isSaving } = useNursingNote();
  const [content, setContent] = useState('');

  // Simple debouncing - in real app, use useAutoSave hook
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);

    // Clear previous timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for auto-save
    const timeout = setTimeout(async () => {
      await storeNote(noteId, {
        patientId: 1, // Get from context or props
        noteDate: new Date().toISOString().split('T')[0],
        content: newContent
      });
    }, 2000); // Auto-save after 2 seconds of inactivity

    setSaveTimeout(timeout);
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="Type here... (auto-saves after 2 seconds)"
      />
      {isSaving && <div className="saving-indicator">Saving...</div>}
    </div>
  );
};

// ==============================|| EXAMPLE 9: UNSIGNED NOTES ||============================== //

/**
 * Example 9: Fetch unsigned notes for nurse to sign
 */
export const UnsignedNotesList: React.FC = () => {
  const { notes, fetchNotes, isLoading } = useNursingNote();

  React.useEffect(() => {
    // Fetch unsigned notes
    fetchNotes({
      noteStatus: ['PENDING_SIGNATURE', 'COMPLETED'],
      includeSigned: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return <div>Loading unsigned notes...</div>;

  return (
    <div>
      <h2>Notes Pending Signature</h2>
      {notes.length === 0 ? (
        <p>No unsigned notes</p>
      ) : (
        <ul>
          {notes.map((note) => (
            <li key={note.id}>
              {note.noteDate} - Patient: {note.patientName}
              <button>Sign</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ==============================|| EXAMPLE 10: COMBINED OPERATIONS ||============================== //

/**
 * Example 10: Complete nursing note management component
 */
export const NursingNoteManager: React.FC<{ patientId: number }> = ({ patientId }) => {
  const {
    notes,
    note,
    fetchNote,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    signNote,
    updateStatus,
    isLoading,
    isSaving,
    error,
    clearError
  } = useNursingNote({ patientId, autoFetch: true });

  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  const handleSelectNote = async (id: number) => {
    setSelectedNoteId(id);
    await fetchNote(id);
  };

  return (
    <div className="nursing-note-manager">
      <div className="sidebar">
        <h3>Nursing Notes</h3>
        {error && (
          <div className="error">
            {error.message}
            <button onClick={clearError}>✕</button>
          </div>
        )}
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <ul>
            {notes.map((n) => (
              <li
                key={n.id}
                onClick={() => handleSelectNote(n.id)}
                className={selectedNoteId === n.id ? 'active' : ''}
              >
                {n.noteDate} - {n.noteStatus}
              </li>
            ))}
          </ul>
        )}
        <button onClick={() => fetchNotes()}>Refresh List</button>
      </div>

      <div className="content">
        {note ? (
          <div>
            <h3>Note Details</h3>
            <p>Date: {note.noteDate}</p>
            <p>Status: {note.noteStatus}</p>
            <p>Content: {note.content}</p>
            <div className="actions">
              <button onClick={() => updateStatus(note.id, 'COMPLETED')} disabled={isSaving}>
                Mark Complete
              </button>
              <button onClick={() => signNote(note.id, 'hash123')} disabled={isSaving}>
                Sign Note
              </button>
              <button onClick={() => deleteNote(note.id)} disabled={isSaving}>
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div>Select a note to view details</div>
        )}
      </div>
    </div>
  );
};

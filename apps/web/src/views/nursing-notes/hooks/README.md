# Nursing Notes Hooks

This directory contains custom React hooks for managing nursing clinical notes.

## Available Hooks

### `useNursingNote` - CRUD Operations Hook

A comprehensive hook for performing all CRUD operations on nursing clinical notes with optimistic updates, error handling, and state management.

#### Features

- ✅ **Full CRUD Operations**: Create, Read, Update, Delete
- ✅ **Digital Signatures**: Sign notes with hash verification
- ✅ **Status Management**: Update note workflow status
- ✅ **Filtering & Pagination**: Query notes with filters and pagination
- ✅ **Optimistic Updates**: Immediate UI updates for better UX
- ✅ **Error Handling**: Comprehensive error catching and reporting
- ✅ **Loading States**: Separate states for fetching and saving
- ✅ **Auto-fetch**: Optional automatic data fetching on mount

#### Basic Usage

```typescript
import { useNursingNote } from './hooks/useNursingNote';

function MyComponent({ patientId }) {
  const {
    notes,
    isLoading,
    createNote,
    updateNote,
    deleteNote
  } = useNursingNote({ patientId, autoFetch: true });

  // Use the hook's operations...
}
```

#### API Reference

##### State

- `note: NursingClinicalNoteWithUsers | null` - Currently selected note with user relationships
- `notes: NursingClinicalNote[]` - Array of fetched notes
- `pagination: PaginatedNursingNotes['pagination'] | null` - Pagination metadata
- `isLoading: boolean` - True when fetching data
- `isSaving: boolean` - True when performing write operations
- `error: Error | null` - Last error that occurred

##### CRUD Operations

- `fetchNote(id: number)` - Fetch a single note by ID
- `fetchNotes(filters?)` - Fetch notes with optional filters and pagination
- `createNote(data: CreateNursingNoteInput)` - Create a new note
- `updateNote(id, data: UpdateNursingNoteInput)` - Full update of existing note
- `patchNote(id, data: Partial<UpdateNursingNoteInput>)` - Partial update
- `storeNote(id, data)` - Create or update (upsert operation)
- `deleteNote(id: number)` - Soft delete a note

##### Signature Operations

- `signNote(id: number, signatureHash: string)` - Sign a note
- `updateStatus(id: number, status: NursingNoteStatus)` - Update note status

##### Utility Functions

- `refreshNotes()` - Refresh the notes list with current filters
- `clearError()` - Clear the error state
- `setNote(note)` - Manually set the current note

#### Examples

See `useNursingNote.example.tsx` for comprehensive usage examples including:
- Basic note listing
- Creating new notes
- Updating existing notes
- Partial updates
- Digital signatures
- Filtered queries with pagination
- Delete operations
- Auto-save patterns
- Unsigned notes management
- Complete note management UI

### `useAutoSave` - Auto-save Hook

A debounced auto-save hook for automatically saving form data as users type.

#### Features

- ⏱️ **Debouncing**: Prevents excessive API calls
- 💾 **Automatic Saving**: Saves changes after period of inactivity
- ⚡ **Configurable Delay**: Customize debounce timing
- 📊 **Save Status Tracking**: Track saving state and errors

#### Basic Usage

```typescript
import { useAutoSave } from './hooks/useAutoSave';

function MyForm({ noteId, initialData }) {
  const {
    data,
    setData,
    isSaving,
    lastSaved,
    error
  } = useAutoSave({
    initialData,
    onSave: async (data) => {
      // Your save logic here
      await saveNote(noteId, data);
    },
    delay: 2000 // Auto-save after 2 seconds of inactivity
  });

  return (
    <div>
      <textarea
        value={data.content}
        onChange={(e) => setData({ ...data, content: e.target.value })}
      />
      {isSaving && <span>Saving...</span>}
      {lastSaved && <span>Last saved: {lastSaved.toLocaleTimeString()}</span>}
    </div>
  );
}
```

## File Structure

```
hooks/
├── README.md                      # This file
├── useAutoSave.ts                 # Auto-save with debouncing hook
├── useNursingNote.ts              # CRUD operations hook
└── useNursingNote.example.tsx     # Usage examples
```

## Best Practices

1. **Error Handling**: Always check for errors after operations
   ```typescript
   const { error, clearError } = useNursingNote({ patientId });

   useEffect(() => {
     if (error) {
       toast.error(error.message);
       clearError();
     }
   }, [error]);
   ```

2. **Optimistic Updates**: The hook automatically handles optimistic updates for better UX

3. **Pagination**: Use pagination for large datasets
   ```typescript
   fetchNotes({
     page: 1,
     limit: 20,
     sortBy: 'noteDate',
     sortOrder: 'desc'
   });
   ```

4. **Filtering**: Combine multiple filters for targeted queries
   ```typescript
   fetchNotes({
     noteStatus: ['COMPLETED', 'SIGNED'],
     startDate: '2024-01-01',
     endDate: '2024-12-31',
     includeSigned: true
   });
   ```

5. **Auto-fetch**: Enable auto-fetch for read-only components
   ```typescript
   const { notes } = useNursingNote({
     patientId,
     autoFetch: true // Automatically load on mount
   });
   ```

## TypeScript Types

All TypeScript types are imported from `types/nursingNote`:

- `NursingClinicalNote` - Core note interface
- `NursingClinicalNoteWithUsers` - Note with populated user relationships
- `CreateNursingNoteInput` - Input for creating notes
- `UpdateNursingNoteInput` - Input for updating notes
- `SignNursingNoteInput` - Input for signing notes
- `NursingNoteFilters` - Filter parameters
- `NursingNotePaginationParams` - Pagination parameters
- `PaginatedNursingNotes` - Paginated response type
- `NursingNoteStatus` - Note status enum

## API Endpoints

The hooks interact with these backend endpoints:

- `GET /patient/nursing-clinical-notes` - List all notes
- `GET /patient/nursing-clinical-notes/:id` - Get single note
- `GET /patient/nursing-clinical-notes/by-patient/:patientId` - Get notes by patient
- `GET /patient/nursing-clinical-notes/by-nurse/:nurseId` - Get notes by nurse
- `GET /patient/nursing-clinical-notes/unsigned` - Get unsigned notes
- `POST /patient/nursing-clinical-notes` - Create note
- `PUT /patient/nursing-clinical-notes/:id` - Update note
- `PATCH /patient/nursing-clinical-notes/:id` - Partial update
- `POST /patient/nursing-clinical-notes/:id` - Store (upsert)
- `DELETE /patient/nursing-clinical-notes/:id` - Delete note
- `POST /patient/nursing-clinical-notes/:id/sign` - Sign note
- `PATCH /patient/nursing-clinical-notes/:id/status` - Update status

## Testing

For testing components that use these hooks, consider using mock implementations:

```typescript
jest.mock('./hooks/useNursingNote', () => ({
  useNursingNote: () => ({
    notes: mockNotes,
    isLoading: false,
    createNote: jest.fn(),
    // ... other mocked functions
  })
}));
```

## Contributing

When adding new functionality:
1. Update the hook implementation
2. Add TypeScript types if needed
3. Create usage examples
4. Update this README
5. Add tests for new features

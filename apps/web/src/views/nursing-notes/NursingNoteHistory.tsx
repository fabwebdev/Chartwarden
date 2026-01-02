'use client';

/**
 * NursingNoteHistory Component
 *
 * Displays a chronological list of nursing clinical notes with:
 * - Filtering by date range, note type, author, and status
 * - Search functionality within note content
 * - Pagination or infinite scroll for large histories
 * - Sort options (date, author, status)
 * - Print/export capabilities
 * - Responsive layout for desktop and tablet
 *
 * @example
 * ```tsx
 * <NursingNoteHistory
 *   patientId={123}
 *   onViewNote={handleView}
 *   onEditNote={handleEdit}
 *   onSignNote={handleSign}
 * />
 * ```
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Stack,
  Chip,
  Pagination,
  InputAdornment,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

// Project imports
import NursingNoteCard from './NursingNoteCard';
import { useNursingNote } from './hooks/useNursingNote';

// Types
import type {
  NursingClinicalNote,
  NursingNoteStatus,
  NursingNoteFilters,
  NursingNotePaginationParams,
} from 'types/nursingNote';

// ==============================|| CONSTANTS ||============================== //

/**
 * Available note statuses for filtering
 */
const NOTE_STATUSES: { value: NursingNoteStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PENDING_SIGNATURE', label: 'Pending Signature' },
  { value: 'SIGNED', label: 'Signed' },
  { value: 'AMENDED', label: 'Amended' },
  { value: 'VOID', label: 'Void' },
];

/**
 * Sort options
 */
const SORT_OPTIONS: {
  value: 'noteDate' | 'noteTimestamp' | 'createdAt' | 'updatedAt';
  label: string;
}[] = [
  { value: 'noteDate', label: 'Note Date' },
  { value: 'noteTimestamp', label: 'Note Timestamp' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Last Modified' },
];

/**
 * Items per page options
 */
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// ==============================|| COMPONENT PROPS ||============================== //

interface NursingNoteHistoryProps {
  /**
   * Patient ID to filter notes by
   */
  patientId?: number;

  /**
   * Nurse ID to filter notes by
   */
  nurseId?: string;

  /**
   * Whether to show filters
   * @default true
   */
  showFilters?: boolean;

  /**
   * Whether to show search
   * @default true
   */
  showSearch?: boolean;

  /**
   * Whether to show export/print options
   * @default true
   */
  showExportOptions?: boolean;

  /**
   * Default page size
   * @default 10
   */
  defaultPageSize?: number;

  /**
   * Callback when a note is clicked to view details
   */
  onViewNote?: (note: NursingClinicalNote) => void;

  /**
   * Callback when edit button is clicked
   */
  onEditNote?: (note: NursingClinicalNote) => void;

  /**
   * Callback when sign button is clicked
   */
  onSignNote?: (note: NursingClinicalNote) => void;

  /**
   * Whether the current user can edit notes
   * @default false
   */
  canEdit?: boolean;

  /**
   * Whether the current user can sign notes
   * @default false
   */
  canSign?: boolean;
}

// ==============================|| MAIN COMPONENT ||============================== //

const NursingNoteHistory = ({
  patientId,
  nurseId,
  showFilters = true,
  showSearch = true,
  showExportOptions = true,
  defaultPageSize = 10,
  onViewNote,
  onEditNote,
  onSignNote,
  canEdit = false,
  canSign = false,
}: NursingNoteHistoryProps) => {
  // ==============================|| STATE ||============================== //

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<NursingNoteStatus | ''>('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [showPRNOnly, setShowPRNOnly] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Sort state
  const [sortBy, setSortBy] = useState<NursingNotePaginationParams['sortBy']>('noteDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // UI state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  // ==============================|| HOOKS ||============================== //

  const filters: NursingNoteFilters & NursingNotePaginationParams = useMemo(
    () => ({
      ...(selectedStatus && { noteStatus: selectedStatus }),
      ...(startDate && { startDate: startDate.format('YYYY-MM-DD') }),
      ...(endDate && { endDate: endDate.format('YYYY-MM-DD') }),
      ...(showPRNOnly && { prnVisit: true }),
      page: currentPage,
      limit: pageSize,
      sortBy,
      sortOrder,
    }),
    [selectedStatus, startDate, endDate, showPRNOnly, currentPage, pageSize, sortBy, sortOrder]
  );

  const {
    notes,
    pagination,
    isLoading,
    error,
    fetchNotes,
    refreshNotes,
  } = useNursingNote({
    patientId,
    nurseId,
    filters,
    autoFetch: true,
  });

  // ==============================|| HANDLERS ||============================== //

  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  /**
   * Handle search submit (could implement full-text search API)
   */
  const handleSearchSubmit = useCallback(() => {
    // Reset to first page when searching
    setCurrentPage(1);
    // Trigger refresh with current filters
    refreshNotes();
  }, [refreshNotes]);

  /**
   * Handle filter changes
   */
  const handleStatusChange = useCallback((event: any) => {
    setSelectedStatus(event.target.value);
    setCurrentPage(1); // Reset to first page
  }, []);

  const handleStartDateChange = useCallback((value: Dayjs | null) => {
    setStartDate(value);
    setCurrentPage(1);
  }, []);

  const handleEndDateChange = useCallback((value: Dayjs | null) => {
    setEndDate(value);
    setCurrentPage(1);
  }, []);

  const handlePRNFilterToggle = useCallback(() => {
    setShowPRNOnly((prev) => !prev);
    setCurrentPage(1);
  }, []);

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedStatus('');
    setStartDate(null);
    setEndDate(null);
    setShowPRNOnly(false);
    setCurrentPage(1);
  }, []);

  /**
   * Handle pagination
   */
  const handlePageChange = useCallback((_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePageSizeChange = useCallback((event: any) => {
    setPageSize(event.target.value);
    setCurrentPage(1); // Reset to first page
  }, []);

  /**
   * Handle sort changes
   */
  const handleSortByChange = useCallback((event: any) => {
    setSortBy(event.target.value);
  }, []);

  const handleSortOrderToggle = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  /**
   * Handle export menu
   */
  const handleExportMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  }, []);

  const handleExportMenuClose = useCallback(() => {
    setExportMenuAnchor(null);
  }, []);

  const handleExportPDF = useCallback(() => {
    // TODO: Implement PDF export
    console.log('Export to PDF');
    handleExportMenuClose();
  }, [handleExportMenuClose]);

  const handlePrint = useCallback(() => {
    window.print();
    handleExportMenuClose();
  }, [handleExportMenuClose]);

  // ==============================|| FILTERED NOTES ||============================== //

  /**
   * Client-side search filter (for displayed notes)
   * Note: For production, implement server-side full-text search
   */
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) {
      return notes;
    }

    const query = searchQuery.toLowerCase();
    return notes.filter((note) => {
      const searchableText = [
        note.content,
        note.subjective,
        note.objective,
        note.assessment,
        note.plan,
        note.nurseName,
        note.patientName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [notes, searchQuery]);

  // ==============================|| EFFECTS ||============================== //

  // Refresh notes when filters change
  useEffect(() => {
    refreshNotes();
  }, [filters]);

  // ==============================|| COMPUTED VALUES ||============================== //

  const hasActiveFilters =
    selectedStatus || startDate || endDate || showPRNOnly || searchQuery.trim();

  const totalPages = pagination?.totalPages || 0;
  const totalNotes = pagination?.total || 0;

  // ==============================|| RENDER ||============================== //

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Header with Search and Actions */}
        <Paper elevation={0} sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Title */}
            <Grid item xs={12} md={4}>
              <Typography variant="h5">Nursing Notes History</Typography>
              <Typography variant="caption" color="text.secondary">
                {totalNotes} {totalNotes === 1 ? 'note' : 'notes'} found
              </Typography>
            </Grid>

            {/* Search */}
            {showSearch && (
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            )}

            {/* Actions */}
            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {showFilters && (
                  <Tooltip title="Toggle Filters">
                    <IconButton
                      onClick={() => setShowFilterPanel(!showFilterPanel)}
                      color={hasActiveFilters ? 'primary' : 'default'}
                    >
                      <FilterListIcon />
                    </IconButton>
                  </Tooltip>
                )}

                <Tooltip title="Refresh">
                  <IconButton onClick={refreshNotes} disabled={isLoading}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>

                {showExportOptions && (
                  <>
                    <Tooltip title="Export/Print">
                      <IconButton onClick={handleExportMenuOpen}>
                        <MoreVertIcon />
                      </IconButton>
                    </Tooltip>
                    <Menu
                      anchorEl={exportMenuAnchor}
                      open={Boolean(exportMenuAnchor)}
                      onClose={handleExportMenuClose}
                    >
                      <MenuItem onClick={handleExportPDF}>
                        <ListItemIcon>
                          <PictureAsPdfIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Export to PDF</ListItemText>
                      </MenuItem>
                      <MenuItem onClick={handlePrint}>
                        <ListItemIcon>
                          <PrintIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Print</ListItemText>
                      </MenuItem>
                    </Menu>
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>

          {/* Filter Panel */}
          {showFilters && showFilterPanel && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedStatus}
                      label="Status"
                      onChange={handleStatusChange}
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      {NOTE_STATUSES.map((status) => (
                        <MenuItem key={status.value} value={status.value}>
                          {status.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Start Date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="End Date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    minDate={startDate || undefined}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Stack direction="row" spacing={1} sx={{ height: '100%', alignItems: 'center' }}>
                    <Chip
                      label="PRN Visits Only"
                      onClick={handlePRNFilterToggle}
                      color={showPRNOnly ? 'primary' : 'default'}
                      variant={showPRNOnly ? 'filled' : 'outlined'}
                    />
                    {hasActiveFilters && (
                      <Button
                        size="small"
                        startIcon={<ClearIcon />}
                        onClick={handleClearFilters}
                      >
                        Clear
                      </Button>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        {/* Sort and Pagination Controls */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Sort By</InputLabel>
              <Select value={sortBy} label="Sort By" onChange={handleSortByChange}>
                {SORT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              size="small"
              variant="outlined"
              onClick={handleSortOrderToggle}
            >
              {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </Button>
          </Stack>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Per Page</InputLabel>
            <Select value={pageSize} label="Per Page" onChange={handlePageSizeChange}>
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Notes List */}
        {!isLoading && filteredNotes.length === 0 && (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No nursing notes found
            </Typography>
            {hasActiveFilters && (
              <Button
                variant="text"
                onClick={handleClearFilters}
                sx={{ mt: 2 }}
              >
                Clear filters to see all notes
              </Button>
            )}
          </Paper>
        )}

        {!isLoading && filteredNotes.length > 0 && (
          <Box>
            {filteredNotes.map((note) => (
              <NursingNoteCard
                key={note.id}
                note={note}
                onView={onViewNote}
                onEdit={onEditNote}
                onSign={onSignNote}
                canEdit={canEdit}
                canSign={canSign}
                highlighted={searchQuery.trim() !== ''}
              />
            ))}
          </Box>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default NursingNoteHistory;

'use client';

import { useState, useEffect, useCallback } from 'react';

// Material-UI
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';

// Icons
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import RetryIcon from '@mui/icons-material/Replay';
import CancelIcon from '@mui/icons-material/Cancel';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GridOnIcon from '@mui/icons-material/GridOn';
import TableChartIcon from '@mui/icons-material/TableChart';
import CodeIcon from '@mui/icons-material/Code';

// Project Imports
import MainCard from 'components/MainCard';
import {
  getReports,
  downloadReport,
  deleteReport,
  retryReport,
  cancelReport,
  toggleReportFavorite,
  formatFileSize,
  formatDuration,
  formatReportDate,
  getStatusLabel,
  getStatusColor,
  getCategoryLabel,
  getFormatLabel,
  getFormatColor,
  triggerDownload,
  REPORT_CATEGORIES,
  REPORT_FORMATS,
  EXECUTION_STATUSES,
  PREDEFINED_DATE_RANGES,
  type GeneratedReport,
  type ReportFilters
} from 'api/reports';

// ==============================|| REPORT FORMAT ICON ||============================== //

const getFormatIcon = (format: string) => {
  switch (format) {
    case 'PDF':
      return <PictureAsPdfIcon fontSize="small" />;
    case 'EXCEL':
      return <GridOnIcon fontSize="small" />;
    case 'CSV':
      return <TableChartIcon fontSize="small" />;
    case 'JSON':
      return <CodeIcon fontSize="small" />;
    default:
      return null;
  }
};

// ==============================|| REPORTS LIST VIEW ||============================== //

interface ReportsListViewProps {
  onGenerateReport: () => void;
}

export default function ReportsListView({ onGenerateReport }: ReportsListViewProps) {
  // State
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('execution_started_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filters
  const [filters, setFilters] = useState<ReportFilters>({
    category: '',
    status: '',
    format: '',
    date_from: '',
    date_to: '',
    search: '',
    favorites_only: false
  });

  // Filter panel visibility
  const [showFilters, setShowFilters] = useState(true);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<number | null>(null);

  // View dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewReport, setViewReport] = useState<GeneratedReport | null>(null);

  // Download progress
  const [downloading, setDownloading] = useState<number | null>(null);

  // Load reports
  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getReports({
        ...filters,
        limit,
        offset: page * limit,
        sort: sortBy,
        order: sortOrder
      });

      if (response.success) {
        setReports(response.data);
        setTotal(response.total);
      } else {
        setError('Failed to load reports');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [filters, limit, page, sortBy, sortOrder]);

  // Load on mount and when dependencies change
  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Handlers
  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      category: '',
      status: '',
      format: '',
      date_from: '',
      date_to: '',
      search: '',
      favorites_only: false
    });
    setPage(0);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleDownload = async (report: GeneratedReport) => {
    setDownloading(report.id);
    try {
      const blob = await downloadReport(report.id);
      triggerDownload(blob, report.output_filename || `report_${report.id}.${report.output_format.toLowerCase()}`);
    } catch (err: any) {
      setError(err.message || 'Failed to download report');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async () => {
    if (!reportToDelete) return;

    try {
      await deleteReport(reportToDelete);
      setDeleteDialogOpen(false);
      setReportToDelete(null);
      loadReports();
    } catch (err: any) {
      setError(err.message || 'Failed to delete report');
    }
  };

  const handleRetry = async (reportId: number) => {
    try {
      await retryReport(reportId);
      loadReports();
    } catch (err: any) {
      setError(err.message || 'Failed to retry report');
    }
  };

  const handleCancel = async (reportId: number) => {
    try {
      await cancelReport(reportId);
      loadReports();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel report');
    }
  };

  const handleToggleFavorite = async (reportId: number, isFavorite: boolean) => {
    try {
      await toggleReportFavorite(reportId, !isFavorite);
      loadReports();
    } catch (err: any) {
      setError(err.message || 'Failed to update favorite');
    }
  };

  const handleView = (report: GeneratedReport) => {
    setViewReport(report);
    setViewDialogOpen(true);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Reports</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadReports}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onGenerateReport}>
            Generate Report
          </Button>
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <MainCard sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by name or type..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  label="Category"
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {REPORT_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {EXECUTION_STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Format</InputLabel>
                <Select
                  value={filters.format}
                  label="Format"
                  onChange={(e) => handleFilterChange('format', e.target.value)}
                >
                  <MenuItem value="">All Formats</MenuItem>
                  {REPORT_FORMATS.map((format) => (
                    <MenuItem key={format.value} value={format.value}>
                      {format.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                sx={{ height: '56px' }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </MainCard>
      )}

      {/* Reports Table */}
      <MainCard content={false}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" width="50px">
                  {/* Favorite column */}
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'report_name'}
                    direction={sortOrder}
                    onClick={() => handleSort('report_name')}
                  >
                    Report Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'report_category'}
                    direction={sortOrder}
                    onClick={() => handleSort('report_category')}
                  >
                    Category
                  </TableSortLabel>
                </TableCell>
                <TableCell>Format</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'execution_status'}
                    direction={sortOrder}
                    onClick={() => handleSort('execution_status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'execution_started_at'}
                    direction={sortOrder}
                    onClick={() => handleSort('execution_started_at')}
                  >
                    Generated
                  </TableSortLabel>
                </TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Generated By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={10}>
                      <Skeleton variant="rectangular" height={40} />
                    </TableCell>
                  </TableRow>
                ))
              ) : reports.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                    <Typography variant="body1" color="text.secondary">
                      No reports found. Generate your first report to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                // Report rows
                reports.map((report) => (
                  <TableRow key={report.id} hover>
                    <TableCell padding="checkbox">
                      <IconButton
                        size="small"
                        onClick={() => handleToggleFavorite(report.id, report.is_favorite || false)}
                      >
                        {report.is_favorite ? (
                          <StarIcon fontSize="small" color="warning" />
                        ) : (
                          <StarBorderIcon fontSize="small" />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {report.report_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {report.report_type}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={getCategoryLabel(report.report_category)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getFormatIcon(report.output_format)}
                        label={getFormatLabel(report.output_format)}
                        size="small"
                        color={getFormatColor(report.output_format) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(report.execution_status)}
                        size="small"
                        color={getStatusColor(report.execution_status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatReportDate(report.execution_started_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDuration(report.execution_duration_ms)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatFileSize(report.file_size_bytes)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{report.generated_by_user_name || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleView(report)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {report.execution_status === 'SUCCESS' && (
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              onClick={() => handleDownload(report)}
                              disabled={downloading === report.id}
                            >
                              {downloading === report.id ? (
                                <CircularProgress size={16} />
                              ) : (
                                <FileDownloadIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                        {report.execution_status === 'FAILED' && (
                          <Tooltip title="Retry">
                            <IconButton size="small" onClick={() => handleRetry(report.id)}>
                              <RetryIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(report.execution_status === 'PENDING' || report.execution_status === 'RUNNING') && (
                          <Tooltip title="Cancel">
                            <IconButton size="small" onClick={() => handleCancel(report.id)}>
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setReportToDelete(report.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={total}
          rowsPerPage={limit}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setLimit(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </MainCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Report</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this report? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Report Details</DialogTitle>
        <DialogContent>
          {viewReport && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Report Name
                </Typography>
                <Typography variant="body1">{viewReport.report_name}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Report Type
                </Typography>
                <Typography variant="body1">{viewReport.report_type}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Category
                </Typography>
                <Chip label={getCategoryLabel(viewReport.report_category)} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Format
                </Typography>
                <Chip
                  icon={getFormatIcon(viewReport.output_format)}
                  label={getFormatLabel(viewReport.output_format)}
                  size="small"
                  color={getFormatColor(viewReport.output_format) as any}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={getStatusLabel(viewReport.execution_status)}
                  size="small"
                  color={getStatusColor(viewReport.execution_status)}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Generated At
                </Typography>
                <Typography variant="body1">{formatReportDate(viewReport.execution_started_at)}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Duration
                </Typography>
                <Typography variant="body1">{formatDuration(viewReport.execution_duration_ms)}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  File Size
                </Typography>
                <Typography variant="body1">{formatFileSize(viewReport.file_size_bytes)}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Rows
                </Typography>
                <Typography variant="body1">{viewReport.row_count?.toLocaleString() || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Generated By
                </Typography>
                <Typography variant="body1">{viewReport.generated_by_user_name || 'N/A'}</Typography>
              </Box>
              {viewReport.error_message && (
                <Box>
                  <Typography variant="subtitle2" color="error">
                    Error Message
                  </Typography>
                  <Typography variant="body2" color="error">
                    {viewReport.error_message}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {viewReport?.execution_status === 'SUCCESS' && (
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={() => {
                if (viewReport) {
                  handleDownload(viewReport);
                  setViewDialogOpen(false);
                }
              }}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

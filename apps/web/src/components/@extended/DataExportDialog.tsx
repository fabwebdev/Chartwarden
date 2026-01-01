'use client';

import { useState, useEffect, useCallback } from 'react';

// MATERIAL - UI
import { useTheme } from '@mui/material/styles';
import Modal from '@mui/material/Modal';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';

// PROJECT IMPORTS
import MainCard from 'components/MainCard';

// ICONS
import { DocumentDownload, Setting2, Calendar, Warning2 } from 'iconsax-react';

// TYPES
export interface ExportFormat {
  id: string;
  name: string;
  description: string;
  mimeType: string;
  extension: string;
}

export interface ResourceType {
  id: string;
  name: string;
  description: string;
  availableColumns: string[];
  defaultColumns: string[];
  dateField: string;
}

export interface ExportEstimate {
  rowCount: number;
  columnCount: number;
  estimatedSizeBytes: number;
  estimatedSizeFormatted: string;
  warning: string | null;
}

export interface DataExportDialogProps {
  open: boolean;
  onClose: () => void;
  resourceType?: string;
  title?: string;
}

// ==============================|| DATA EXPORT DIALOG ||============================== //

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function DataExportDialog({
  open,
  onClose,
  resourceType: initialResourceType,
  title = 'Export Data'
}: DataExportDialogProps) {
  const theme = useTheme();

  // State
  const [formats, setFormats] = useState<ExportFormat[]>([]);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');
  const [selectedResourceType, setSelectedResourceType] = useState<string>(initialResourceType || '');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customFilename, setCustomFilename] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Loading states
  const [loadingFormats, setLoadingFormats] = useState<boolean>(false);
  const [loadingResourceTypes, setLoadingResourceTypes] = useState<boolean>(false);
  const [estimating, setEstimating] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  // Results
  const [estimate, setEstimate] = useState<ExportEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  // Fetch formats and resource types on open
  useEffect(() => {
    if (open) {
      fetchFormats();
      fetchResourceTypes();
      setError(null);
      setExportSuccess(false);
    }
  }, [open]);

  // Update resource type when prop changes
  useEffect(() => {
    if (initialResourceType) {
      setSelectedResourceType(initialResourceType);
    }
  }, [initialResourceType]);

  // Update selected columns when resource type changes
  useEffect(() => {
    const resource = resourceTypes.find(r => r.id === selectedResourceType);
    if (resource) {
      setSelectedColumns(resource.defaultColumns);
    }
  }, [selectedResourceType, resourceTypes]);

  // Fetch estimate when parameters change
  useEffect(() => {
    if (selectedResourceType && selectedFormat) {
      estimateExport();
    }
  }, [selectedResourceType, selectedFormat, selectedColumns, startDate, endDate]);

  const fetchFormats = async () => {
    setLoadingFormats(true);
    try {
      const response = await fetch(`${API_BASE_URL}/data-export/formats`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setFormats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch formats:', err);
    } finally {
      setLoadingFormats(false);
    }
  };

  const fetchResourceTypes = async () => {
    setLoadingResourceTypes(true);
    try {
      const response = await fetch(`${API_BASE_URL}/data-export/resource-types`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'success') {
        setResourceTypes(data.data);
        if (!selectedResourceType && data.data.length > 0) {
          setSelectedResourceType(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch resource types:', err);
    } finally {
      setLoadingResourceTypes(false);
    }
  };

  const estimateExport = useCallback(async () => {
    if (!selectedResourceType || !selectedFormat) return;

    setEstimating(true);
    setEstimate(null);

    try {
      const response = await fetch(`${API_BASE_URL}/data-export/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          resourceType: selectedResourceType,
          format: selectedFormat,
          columns: selectedColumns.length > 0 ? selectedColumns : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setEstimate(data.data);
      } else {
        setError(data.message || 'Failed to estimate export size');
      }
    } catch (err) {
      console.error('Failed to estimate export:', err);
    } finally {
      setEstimating(false);
    }
  }, [selectedResourceType, selectedFormat, selectedColumns, startDate, endDate]);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setExportSuccess(false);

    try {
      const response = await fetch(`${API_BASE_URL}/data-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          resourceType: selectedResourceType,
          format: selectedFormat,
          columns: selectedColumns.length > 0 ? selectedColumns : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          filename: customFilename || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Export failed');
      }

      // Check if response is empty (no data)
      const contentType = response.headers.get('Content-Type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        if (data.data?.isEmpty) {
          setError('No records match the specified criteria');
          return;
        }
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `export.${selectedFormat === 'excel' ? 'xlsx' : selectedFormat}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(true);

      // Close dialog after short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleFormatChange = (event: SelectChangeEvent) => {
    setSelectedFormat(event.target.value);
  };

  const handleResourceTypeChange = (event: SelectChangeEvent) => {
    setSelectedResourceType(event.target.value);
  };

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const handleSelectAllColumns = () => {
    const resource = resourceTypes.find(r => r.id === selectedResourceType);
    if (resource) {
      if (selectedColumns.length === resource.availableColumns.length) {
        setSelectedColumns(resource.defaultColumns);
      } else {
        setSelectedColumns([...resource.availableColumns]);
      }
    }
  };

  const currentResource = resourceTypes.find(r => r.id === selectedResourceType);
  const isLoading = loadingFormats || loadingResourceTypes;

  return (
    <Modal
      open={open}
      onClose={exporting ? undefined : onClose}
      aria-labelledby="data-export-title"
    >
      <MainCard
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <DocumentDownload size={24} />
            <span>{title}</span>
          </Stack>
        }
        modal
        darkTitle
        content={false}
        sx={{
          width: { xs: '95%', sm: 600, md: 700 },
          maxWidth: '100%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <CardContent>
          {isLoading ? (
            <Stack alignItems="center" spacing={2} py={4}>
              <CircularProgress />
              <Typography color="text.secondary">Loading export options...</Typography>
            </Stack>
          ) : (
            <Stack spacing={3}>
              {/* Resource Type Selection */}
              {!initialResourceType && (
                <FormControl fullWidth>
                  <InputLabel id="resource-type-label">Data Type</InputLabel>
                  <Select
                    labelId="resource-type-label"
                    value={selectedResourceType}
                    label="Data Type"
                    onChange={handleResourceTypeChange}
                    disabled={exporting}
                  >
                    {resourceTypes.map(rt => (
                      <MenuItem key={rt.id} value={rt.id}>
                        <Stack>
                          <Typography variant="body1">{rt.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {rt.description}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {/* Format Selection */}
              <FormControl fullWidth>
                <InputLabel id="format-label">Export Format</InputLabel>
                <Select
                  labelId="format-label"
                  value={selectedFormat}
                  label="Export Format"
                  onChange={handleFormatChange}
                  disabled={exporting}
                >
                  {formats.map(f => (
                    <MenuItem key={f.id} value={f.id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={f.extension.toUpperCase()}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Box>
                          <Typography variant="body1">{f.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {f.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Date Range Filters */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  disabled={exporting}
                  InputProps={{
                    startAdornment: <Calendar size={18} style={{ marginRight: 8, color: theme.palette.text.secondary }} />
                  }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  disabled={exporting}
                  InputProps={{
                    startAdornment: <Calendar size={18} style={{ marginRight: 8, color: theme.palette.text.secondary }} />
                  }}
                />
              </Stack>

              {/* Advanced Options Toggle */}
              <Button
                variant="text"
                color="secondary"
                onClick={() => setShowAdvanced(!showAdvanced)}
                startIcon={<Setting2 size={18} />}
                sx={{ alignSelf: 'flex-start' }}
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </Button>

              {/* Advanced Options */}
              <Collapse in={showAdvanced}>
                <Stack spacing={2} sx={{ pl: 2, borderLeft: `2px solid ${theme.palette.divider}` }}>
                  {/* Custom Filename */}
                  <TextField
                    label="Custom Filename"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder="Optional custom filename"
                    helperText="Leave blank for automatic timestamp-based filename"
                    fullWidth
                    disabled={exporting}
                  />

                  {/* Column Selection */}
                  {currentResource && (
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2">Select Columns</Typography>
                        <Button
                          size="small"
                          onClick={handleSelectAllColumns}
                          disabled={exporting}
                        >
                          {selectedColumns.length === currentResource.availableColumns.length
                            ? 'Reset to Default'
                            : 'Select All'}
                        </Button>
                      </Stack>
                      <FormGroup row sx={{ gap: 1 }}>
                        {currentResource.availableColumns.map(col => (
                          <FormControlLabel
                            key={col}
                            control={
                              <Checkbox
                                checked={selectedColumns.includes(col)}
                                onChange={() => handleColumnToggle(col)}
                                size="small"
                                disabled={exporting}
                              />
                            }
                            label={
                              <Typography variant="body2">
                                {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Typography>
                            }
                            sx={{
                              border: `1px solid ${theme.palette.divider}`,
                              borderRadius: 1,
                              px: 1,
                              m: 0
                            }}
                          />
                        ))}
                      </FormGroup>
                    </Box>
                  )}
                </Stack>
              </Collapse>

              {/* Export Size Estimate */}
              {estimating && (
                <LinearProgress />
              )}

              {estimate && !estimating && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    backgroundColor: theme.palette.grey[50],
                    border: `1px solid ${theme.palette.divider}`
                  }}
                >
                  <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
                    <Box>
                      <Typography variant="caption" color="text.secondary">Records</Typography>
                      <Typography variant="h6">{estimate.rowCount.toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Columns</Typography>
                      <Typography variant="h6">{estimate.columnCount}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Estimated Size</Typography>
                      <Typography variant="h6">{estimate.estimatedSizeFormatted}</Typography>
                    </Box>
                  </Stack>
                  {estimate.warning && (
                    <Alert
                      severity="warning"
                      icon={<Warning2 size={18} />}
                      sx={{ mt: 2 }}
                    >
                      {estimate.warning}
                    </Alert>
                  )}
                </Box>
              )}

              {/* Error Message */}
              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {/* Success Message */}
              {exportSuccess && (
                <Alert severity="success">
                  Export completed successfully! Your download should start automatically.
                </Alert>
              )}
            </Stack>
          )}
        </CardContent>

        <Divider />

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 2.5, py: 2 }}>
          <Button
            color="secondary"
            onClick={onClose}
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={exporting || !selectedResourceType || !selectedFormat || (estimate?.rowCount === 0)}
            startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <DocumentDownload size={18} />}
          >
            {exporting ? 'Exporting...' : 'Export Data'}
          </Button>
        </Stack>
      </MainCard>
    </Modal>
  );
}

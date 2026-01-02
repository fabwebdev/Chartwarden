'use client';

import { useState, useEffect } from 'react';

// Material-UI
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import FormHelperText from '@mui/material/FormHelperText';

// Date picker
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// Icons
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import GridOnIcon from '@mui/icons-material/GridOn';
import TableChartIcon from '@mui/icons-material/TableChart';
import CodeIcon from '@mui/icons-material/Code';
import InfoIcon from '@mui/icons-material/Info';

// Project imports
import {
  getReportTypes,
  generateReport,
  calculateDateRange,
  REPORT_CATEGORIES,
  REPORT_FORMATS,
  PREDEFINED_DATE_RANGES,
  type ReportTypeInfo,
  type GenerateReportRequest
} from 'api/reports';

// ==============================|| REPORT GENERATION DIALOG ||============================== //

interface ReportGenerationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const STEPS = ['Select Report', 'Configure Filters', 'Choose Format', 'Generate'];

export default function ReportGenerationDialog({ open, onClose, onSuccess }: ReportGenerationDialogProps) {
  // State
  const [activeStep, setActiveStep] = useState(0);
  const [reportTypes, setReportTypes] = useState<Record<string, ReportTypeInfo[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Form data
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedReportType, setSelectedReportType] = useState<ReportTypeInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('PDF');
  const [dateRangeType, setDateRangeType] = useState('last_30_days');
  const [customDateFrom, setCustomDateFrom] = useState<Date | null>(null);
  const [customDateTo, setCustomDateTo] = useState<Date | null>(null);
  const [additionalFilters, setAdditionalFilters] = useState<Record<string, any>>({});

  // Load report types on mount
  useEffect(() => {
    if (open) {
      loadReportTypes();
    }
  }, [open]);

  const loadReportTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getReportTypes();
      if (response.success) {
        setReportTypes(response.data.categories);
      } else {
        setError('Failed to load report types');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load report types');
    } finally {
      setLoading(false);
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setActiveStep(0);
      setSelectedCategory('');
      setSelectedReportType(null);
      setSelectedFormat('PDF');
      setDateRangeType('last_30_days');
      setCustomDateFrom(null);
      setCustomDateTo(null);
      setAdditionalFilters({});
      setError(null);
      setProgress(0);
    }
  }, [open]);

  // Progress simulation during generation
  useEffect(() => {
    if (generating) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [generating]);

  const handleNext = () => {
    setError(null);

    // Validate current step
    if (activeStep === 0 && !selectedReportType) {
      setError('Please select a report type');
      return;
    }

    if (activeStep === 1) {
      // Validate filters
      if (dateRangeType === 'custom') {
        if (!customDateFrom || !customDateTo) {
          setError('Please select both start and end dates');
          return;
        }
        if (customDateFrom > customDateTo) {
          setError('Start date must be before end date');
          return;
        }
      }
    }

    if (activeStep === 2 && !selectedFormat) {
      setError('Please select a format');
      return;
    }

    if (activeStep === STEPS.length - 1) {
      handleGenerate();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleGenerate = async () => {
    if (!selectedReportType) return;

    setGenerating(true);
    setError(null);
    setProgress(0);

    try {
      // Calculate date range
      let dateFrom: string | undefined;
      let dateTo: string | undefined;

      if (dateRangeType === 'custom') {
        dateFrom = customDateFrom?.toISOString();
        dateTo = customDateTo?.toISOString();
      } else if (dateRangeType !== 'all_time') {
        const range = calculateDateRange(dateRangeType);
        dateFrom = range.from.toISOString();
        dateTo = range.to.toISOString();
      }

      const filters: Record<string, any> = {
        ...additionalFilters
      };

      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;

      const request: GenerateReportRequest = {
        report_type: selectedReportType.type,
        output_format: selectedFormat,
        filters,
        async: true // Generate asynchronously for better UX
      };

      const response = await generateReport(request);

      if (response.success) {
        setProgress(100);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else {
        setError('Failed to generate report');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF':
        return <PictureAsPdfIcon />;
      case 'EXCEL':
        return <GridOnIcon />;
      case 'CSV':
        return <TableChartIcon />;
      case 'JSON':
        return <CodeIcon />;
      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Generate Report</DialogTitle>

        {/* Progress Stepper */}
        <Box sx={{ px: 3, pt: 2 }}>
          <Stepper activeStep={activeStep}>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <DialogContent>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {generating && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Generating report... {Math.round(progress)}%
              </Typography>
            </Box>
          )}

          {/* Step 0: Select Report Type */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Select Report Type
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={selectedCategory}
                      label="Category"
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedReportType(null);
                      }}
                    >
                      {REPORT_CATEGORIES.map((cat) => (
                        <MenuItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedCategory && reportTypes[selectedCategory] && (
                    <Grid container spacing={2}>
                      {reportTypes[selectedCategory].map((reportType) => (
                        <Grid item xs={12} key={reportType.type}>
                          <Box
                            sx={{
                              p: 2,
                              border: 1,
                              borderColor: selectedReportType?.type === reportType.type ? 'primary.main' : 'divider',
                              borderRadius: 1,
                              cursor: 'pointer',
                              bgcolor:
                                selectedReportType?.type === reportType.type ? 'action.selected' : 'background.paper',
                              '&:hover': {
                                bgcolor: 'action.hover'
                              }
                            }}
                            onClick={() => setSelectedReportType(reportType)}
                          >
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                              {reportType.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {reportType.description}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                              {reportType.supportedFormats.map((format) => (
                                <Chip key={format} label={format} size="small" variant="outlined" />
                              ))}
                            </Stack>
                            {reportType.estimatedDuration && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Est. time: {reportType.estimatedDuration}
                              </Typography>
                            )}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Step 1: Configure Filters */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Configure Filters
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRangeType}
                  label="Date Range"
                  onChange={(e) => setDateRangeType(e.target.value)}
                >
                  {PREDEFINED_DATE_RANGES.map((range) => (
                    <MenuItem key={range.value} value={range.value}>
                      {range.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {dateRangeType === 'custom' && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Start Date"
                      value={customDateFrom}
                      onChange={(date) => setCustomDateFrom(date)}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="End Date"
                      value={customDateTo}
                      onChange={(date) => setCustomDateTo(date)}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                </Grid>
              )}

              {selectedReportType?.requiresFilters && selectedReportType.requiresFilters.length > 0 && (
                <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
                  This report requires additional filters: {selectedReportType.requiresFilters.join(', ')}
                </Alert>
              )}
            </Box>
          )}

          {/* Step 2: Choose Format */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Choose Output Format
              </Typography>

              <Grid container spacing={2}>
                {selectedReportType?.supportedFormats.map((format) => {
                  const formatInfo = REPORT_FORMATS.find((f) => f.value === format);
                  return (
                    <Grid item xs={12} sm={6} md={3} key={format}>
                      <Box
                        sx={{
                          p: 3,
                          border: 2,
                          borderColor: selectedFormat === format ? 'primary.main' : 'divider',
                          borderRadius: 2,
                          cursor: 'pointer',
                          textAlign: 'center',
                          bgcolor: selectedFormat === format ? 'action.selected' : 'background.paper',
                          '&:hover': {
                            bgcolor: 'action.hover'
                          }
                        }}
                        onClick={() => setSelectedFormat(format)}
                      >
                        <Box sx={{ mb: 1, color: `${formatInfo?.color}.main` }}>{getFormatIcon(format)}</Box>
                        <Typography variant="subtitle1">{formatInfo?.label}</Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>

              {selectedFormat && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  {selectedFormat === 'PDF' &&
                    'PDF format includes page numbers, headers, and company branding. Best for printing and sharing.'}
                  {selectedFormat === 'EXCEL' &&
                    'Excel format allows for further data analysis and manipulation with formulas and charts.'}
                  {selectedFormat === 'CSV' && 'CSV format is ideal for importing into other systems or databases.'}
                  {selectedFormat === 'JSON' && 'JSON format is designed for API integrations and programmatic access.'}
                </Alert>
              )}
            </Box>
          )}

          {/* Step 3: Review and Generate */}
          {activeStep === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Review and Generate
              </Typography>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Report Type
                  </Typography>
                  <Typography variant="body1">{selectedReportType?.name}</Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Category
                  </Typography>
                  <Chip
                    label={REPORT_CATEGORIES.find((c) => c.value === selectedCategory)?.label}
                    size="small"
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Date Range
                  </Typography>
                  <Typography variant="body1">
                    {dateRangeType === 'custom'
                      ? `${customDateFrom?.toLocaleDateString()} - ${customDateTo?.toLocaleDateString()}`
                      : PREDEFINED_DATE_RANGES.find((r) => r.value === dateRangeType)?.label}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Output Format
                  </Typography>
                  <Chip
                    icon={getFormatIcon(selectedFormat)}
                    label={REPORT_FORMATS.find((f) => f.value === selectedFormat)?.label}
                    size="small"
                  />
                </Box>

                {selectedReportType?.estimatedDuration && (
                  <Alert severity="info">
                    Estimated generation time: {selectedReportType.estimatedDuration}. The report will be generated
                    in the background and you'll be able to download it from the reports list.
                  </Alert>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={generating}>
            Cancel
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack} disabled={generating}>
              Back
            </Button>
          )}
          <Button onClick={handleNext} variant="contained" disabled={generating || loading}>
            {activeStep === STEPS.length - 1 ? 'Generate' : 'Next'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}

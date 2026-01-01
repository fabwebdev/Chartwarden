'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
  useTheme
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ListIcon from '@mui/icons-material/List';
import CloseIcon from '@mui/icons-material/Close';

import VitalSignsForm from './VitalSignsForm';
import VitalSignsTrendChart from './VitalSignsTrendChart';
import {
  getPatientVitalSigns,
  getPatientLatestVitalSigns,
  createPatientVitalSigns
} from 'api/patient';

interface VitalSignsPageProps {
  patientId: string;
}

interface VitalSignRecord {
  id: number;
  measurement_timestamp: string;
  degrees_fahrenheit?: number;
  heart_rate?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  respiratory_rate?: number;
  pulse_oximetry_percentage?: number;
  pain_score?: number;
  is_abnormal?: boolean;
  general_notes?: string;
  created_by_id?: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vitals-tabpanel-${index}`}
      aria-labelledby={`vitals-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const VitalSignsPage = ({ patientId }: VitalSignsPageProps) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [vitalSigns, setVitalSigns] = useState<VitalSignRecord[]>([]);
  const [latestVitals, setLatestVitals] = useState<VitalSignRecord | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch vital signs data
  const fetchVitalSigns = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await getPatientVitalSigns(patientId, {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        sortBy: 'measurement_timestamp',
        sortOrder: 'desc'
      });

      if (response.success) {
        setVitalSigns(response.data || []);
        setTotalCount(response.pagination?.totalCount || 0);
      } else {
        setError(response.error?.message || 'Failed to load vital signs');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load vital signs');
    } finally {
      setIsLoading(false);
    }
  }, [patientId, page, rowsPerPage]);

  // Fetch latest vitals for summary cards
  const fetchLatestVitals = useCallback(async () => {
    try {
      const response = await getPatientLatestVitalSigns(patientId);
      if (response.success && response.data) {
        setLatestVitals(response.data);
      }
    } catch (err) {
      // Silently fail - latest vitals are optional
      console.error('Failed to fetch latest vitals:', err);
    }
  }, [patientId]);

  useEffect(() => {
    fetchVitalSigns();
    fetchLatestVitals();
  }, [fetchVitalSigns, fetchLatestVitals]);

  // Handle form submission
  const handleFormSubmit = async (data: any) => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await createPatientVitalSigns(patientId, data);

      if (response.success) {
        setSuccessMessage('Vital signs recorded successfully');
        setIsFormOpen(false);
        // Refresh data
        await fetchVitalSigns();
        await fetchLatestVitals();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error(response.error?.message || 'Failed to save vital signs');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save vital signs');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Format vital sign value with unit
  const formatVitalValue = (value: number | undefined, unit: string) => {
    if (value === undefined || value === null) return '-';
    return `${value} ${unit}`;
  };

  // Format date/time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Render summary cards for latest vitals
  const renderVitalCard = (
    title: string,
    value: string,
    unit: string,
    isAbnormal?: boolean,
    normalRange?: string
  ) => (
    <Card
      variant="outlined"
      sx={{
        borderColor: isAbnormal ? theme.palette.warning.main : theme.palette.divider,
        backgroundColor: isAbnormal ? theme.palette.warning.light + '10' : 'transparent'
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography
          variant="h4"
          color={isAbnormal ? 'warning.main' : 'text.primary'}
          sx={{ fontWeight: 'bold' }}
        >
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {unit}
        </Typography>
        {normalRange && (
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
            Normal: {normalRange}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Vital Signs</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsFormOpen(true)}
        >
          Record Vitals
        </Button>
      </Box>

      {/* Alerts */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Latest Vitals Summary Cards */}
      {latestVitals && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Latest Readings ({formatDateTime(latestVitals.measurement_timestamp)})
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={4} md={2}>
              {renderVitalCard(
                'Blood Pressure',
                latestVitals.bp_systolic && latestVitals.bp_diastolic
                  ? `${latestVitals.bp_systolic}/${latestVitals.bp_diastolic}`
                  : '-',
                'mmHg',
                false,
                '90/60 - 140/90'
              )}
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              {renderVitalCard(
                'Heart Rate',
                latestVitals.heart_rate?.toString() || '-',
                'BPM',
                latestVitals.heart_rate ? (latestVitals.heart_rate < 60 || latestVitals.heart_rate > 100) : false,
                '60 - 100'
              )}
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              {renderVitalCard(
                'Temperature',
                latestVitals.degrees_fahrenheit?.toString() || '-',
                '°F',
                latestVitals.degrees_fahrenheit ? (latestVitals.degrees_fahrenheit < 97.8 || latestVitals.degrees_fahrenheit > 99.1) : false,
                '97.8 - 99.1'
              )}
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              {renderVitalCard(
                'Resp Rate',
                latestVitals.respiratory_rate?.toString() || '-',
                'breaths/min',
                latestVitals.respiratory_rate ? (latestVitals.respiratory_rate < 12 || latestVitals.respiratory_rate > 20) : false,
                '12 - 20'
              )}
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              {renderVitalCard(
                'SpO2',
                latestVitals.pulse_oximetry_percentage?.toString() || '-',
                '%',
                latestVitals.pulse_oximetry_percentage ? latestVitals.pulse_oximetry_percentage < 95 : false,
                '95 - 100'
              )}
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              {renderVitalCard(
                'Pain Score',
                latestVitals.pain_score?.toString() || '-',
                '/10',
                latestVitals.pain_score ? latestVitals.pain_score > 3 : false,
                '0 - 3'
              )}
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="vital signs tabs">
          <Tab
            icon={<TrendingUpIcon />}
            iconPosition="start"
            label="Trends"
            id="vitals-tab-0"
            aria-controls="vitals-tabpanel-0"
          />
          <Tab
            icon={<ListIcon />}
            iconPosition="start"
            label="History"
            id="vitals-tab-1"
            aria-controls="vitals-tabpanel-1"
          />
        </Tabs>
      </Box>

      {/* Trends Tab */}
      <TabPanel value={activeTab} index={0}>
        <VitalSignsTrendChart
          data={vitalSigns}
          isLoading={isLoading}
          error={error}
        />
      </TabPanel>

      {/* History Tab */}
      <TabPanel value={activeTab} index={1}>
        {isLoading ? (
          <Box>
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} variant="rectangular" height={50} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : vitalSigns.length === 0 ? (
          <Alert severity="info">
            No vital signs recorded yet. Click "Record Vitals" to add the first entry.
          </Alert>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date/Time</TableCell>
                    <TableCell align="center">BP (mmHg)</TableCell>
                    <TableCell align="center">HR (BPM)</TableCell>
                    <TableCell align="center">Temp (°F)</TableCell>
                    <TableCell align="center">RR</TableCell>
                    <TableCell align="center">SpO2 (%)</TableCell>
                    <TableCell align="center">Pain</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vitalSigns.map((record) => (
                    <TableRow
                      key={record.id}
                      hover
                      sx={{
                        backgroundColor: record.is_abnormal
                          ? theme.palette.warning.light + '20'
                          : 'inherit'
                      }}
                    >
                      <TableCell>
                        {formatDateTime(record.measurement_timestamp)}
                      </TableCell>
                      <TableCell align="center">
                        {record.bp_systolic && record.bp_diastolic
                          ? `${record.bp_systolic}/${record.bp_diastolic}`
                          : '-'}
                      </TableCell>
                      <TableCell align="center">
                        {record.heart_rate || '-'}
                      </TableCell>
                      <TableCell align="center">
                        {record.degrees_fahrenheit || '-'}
                      </TableCell>
                      <TableCell align="center">
                        {record.respiratory_rate || '-'}
                      </TableCell>
                      <TableCell align="center">
                        {record.pulse_oximetry_percentage || '-'}
                      </TableCell>
                      <TableCell align="center">
                        {record.pain_score !== undefined ? record.pain_score : '-'}
                      </TableCell>
                      <TableCell align="center">
                        {record.is_abnormal ? (
                          <Chip
                            label="Abnormal"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            label="Normal"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </TabPanel>

      {/* Form Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={() => !isSaving && setIsFormOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Record Vital Signs</Typography>
            <IconButton
              onClick={() => setIsFormOpen(false)}
              disabled={isSaving}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <VitalSignsForm
            patientId={patientId}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            isLoading={isSaving}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default VitalSignsPage;

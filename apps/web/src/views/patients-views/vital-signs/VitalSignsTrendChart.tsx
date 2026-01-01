'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  Skeleton,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import SimpleLineChart, { LineChartDataPoint } from 'components/charts/SimpleLineChart';

// Vital sign type definitions
type VitalType = 'temperature' | 'heart_rate' | 'blood_pressure' | 'respiratory_rate' | 'spo2' | 'pain';

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
}

interface VitalSignsTrendChartProps {
  data: VitalSignRecord[];
  isLoading?: boolean;
  error?: string | null;
}

// Normal ranges for reference lines
const VITAL_SIGN_NORMAL_RANGES = {
  temperature: { low: 97.8, high: 99.1, unit: '°F', label: 'Temperature' },
  heart_rate: { low: 60, high: 100, unit: 'BPM', label: 'Heart Rate' },
  blood_pressure: { low: '90/60', high: '140/90', unit: 'mmHg', label: 'Blood Pressure' },
  respiratory_rate: { low: 12, high: 20, unit: 'breaths/min', label: 'Respiratory Rate' },
  spo2: { low: 95, high: 100, unit: '%', label: 'SpO2' },
  pain: { low: 0, high: 3, unit: '/10', label: 'Pain Score' }
};

// Time range options
const TIME_RANGES = [
  { value: '7d', label: '7 Days' },
  { value: '14d', label: '14 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: 'all', label: 'All Time' }
];

const VitalSignsTrendChart = ({
  data,
  isLoading = false,
  error = null
}: VitalSignsTrendChartProps) => {
  const theme = useTheme();
  const [selectedVital, setSelectedVital] = useState<VitalType>('blood_pressure');
  const [timeRange, setTimeRange] = useState<string>('30d');

  // Filter data by time range
  const filteredData = useMemo(() => {
    if (!data || timeRange === 'all') return data || [];

    const now = new Date();
    const days = parseInt(timeRange.replace('d', ''));
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return data.filter(record => new Date(record.measurement_timestamp) >= cutoffDate);
  }, [data, timeRange]);

  // Sort data by timestamp
  const sortedData = useMemo(() => {
    return [...filteredData].sort(
      (a, b) => new Date(a.measurement_timestamp).getTime() - new Date(b.measurement_timestamp).getTime()
    );
  }, [filteredData]);

  // Transform data for the chart based on selected vital type
  const chartData: LineChartDataPoint[] = useMemo(() => {
    return sortedData.map(record => {
      const date = new Date(record.measurement_timestamp);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;

      let value = 0;
      let secondary: number | undefined;

      switch (selectedVital) {
        case 'temperature':
          value = record.degrees_fahrenheit || 0;
          break;
        case 'heart_rate':
          value = record.heart_rate || 0;
          break;
        case 'blood_pressure':
          value = record.bp_systolic || 0;
          secondary = record.bp_diastolic || undefined;
          break;
        case 'respiratory_rate':
          value = record.respiratory_rate || 0;
          break;
        case 'spo2':
          value = record.pulse_oximetry_percentage || 0;
          break;
        case 'pain':
          value = record.pain_score || 0;
          break;
      }

      return { label, value, secondary };
    }).filter(point => point.value > 0);
  }, [sortedData, selectedVital]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const values = chartData.map(d => d.value);
    const secondaryValues = chartData.filter(d => d.secondary !== undefined).map(d => d.secondary!);

    const calcStats = (vals: number[]) => {
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return { avg: avg.toFixed(1), min, max, count: vals.length };
    };

    const primary = calcStats(values);
    const secondary = secondaryValues.length > 0 ? calcStats(secondaryValues) : null;

    return { primary, secondary };
  }, [chartData]);

  // Get latest values
  const latestVitals = useMemo(() => {
    if (sortedData.length === 0) return null;
    return sortedData[sortedData.length - 1];
  }, [sortedData]);

  const handleVitalChange = (_event: React.MouseEvent<HTMLElement>, newVital: VitalType | null) => {
    if (newVital !== null) {
      setSelectedVital(newVital);
    }
  };

  const handleTimeRangeChange = (event: any) => {
    setTimeRange(event.target.value);
  };

  // Get chart labels based on vital type
  const getChartLabels = () => {
    const range = VITAL_SIGN_NORMAL_RANGES[selectedVital];
    if (selectedVital === 'blood_pressure') {
      return {
        primaryLabel: 'Systolic (mmHg)',
        secondaryLabel: 'Diastolic (mmHg)',
        title: `${range.label} Trend`
      };
    }
    return {
      primaryLabel: `${range.label} (${range.unit})`,
      secondaryLabel: '',
      title: `${range.label} Trend`
    };
  };

  const chartLabels = getChartLabels();

  // Format value for display
  const formatVitalValue = (vital: VitalType, record: VitalSignRecord | null) => {
    if (!record) return '-';
    switch (vital) {
      case 'temperature':
        return record.degrees_fahrenheit ? `${record.degrees_fahrenheit}°F` : '-';
      case 'heart_rate':
        return record.heart_rate ? `${record.heart_rate} BPM` : '-';
      case 'blood_pressure':
        return record.bp_systolic && record.bp_diastolic
          ? `${record.bp_systolic}/${record.bp_diastolic} mmHg`
          : '-';
      case 'respiratory_rate':
        return record.respiratory_rate ? `${record.respiratory_rate} breaths/min` : '-';
      case 'spo2':
        return record.pulse_oximetry_percentage ? `${record.pulse_oximetry_percentage}%` : '-';
      case 'pain':
        return record.pain_score !== undefined ? `${record.pain_score}/10` : '-';
      default:
        return '-';
    }
  };

  if (isLoading) {
    return (
      <Paper elevation={0} sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={300} />
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={0} sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header Controls */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5">Vital Signs Trends</Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={handleTimeRangeChange}
              >
                {TIME_RANGES.map(range => (
                  <MenuItem key={range.value} value={range.value}>{range.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Grid>

        {/* Vital Type Selection */}
        <Grid item xs={12}>
          <ToggleButtonGroup
            value={selectedVital}
            exclusive
            onChange={handleVitalChange}
            aria-label="vital sign type"
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            <ToggleButton value="blood_pressure" aria-label="blood pressure">
              Blood Pressure
            </ToggleButton>
            <ToggleButton value="heart_rate" aria-label="heart rate">
              Heart Rate
            </ToggleButton>
            <ToggleButton value="temperature" aria-label="temperature">
              Temperature
            </ToggleButton>
            <ToggleButton value="respiratory_rate" aria-label="respiratory rate">
              Respiratory Rate
            </ToggleButton>
            <ToggleButton value="spo2" aria-label="oxygen saturation">
              SpO2
            </ToggleButton>
            <ToggleButton value="pain" aria-label="pain score">
              Pain
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>

        {/* Latest Value Summary */}
        {latestVitals && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Latest Reading:
              </Typography>
              <Chip
                label={formatVitalValue(selectedVital, latestVitals)}
                color={latestVitals.is_abnormal ? 'warning' : 'default'}
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                {new Date(latestVitals.measurement_timestamp).toLocaleString()}
              </Typography>
            </Box>
          </Grid>
        )}

        {/* Chart */}
        <Grid item xs={12}>
          {chartData.length > 0 ? (
            <Box sx={{ minHeight: 300 }}>
              <Typography variant="subtitle1" gutterBottom color="text.secondary">
                {chartLabels.title}
              </Typography>
              <SimpleLineChart
                data={chartData}
                height={280}
                showGrid={true}
                showArea={true}
                showDots={true}
                primaryLabel={chartLabels.primaryLabel}
                secondaryLabel={chartLabels.secondaryLabel}
                primaryColor={theme.palette.primary.main}
                secondaryColor={theme.palette.secondary.main}
              />
              {/* Normal Range Reference */}
              <Box sx={{ mt: 1, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Normal Range: {VITAL_SIGN_NORMAL_RANGES[selectedVital].low} - {VITAL_SIGN_NORMAL_RANGES[selectedVital].high} {VITAL_SIGN_NORMAL_RANGES[selectedVital].unit}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography color="text.secondary">
                No {VITAL_SIGN_NORMAL_RANGES[selectedVital].label.toLowerCase()} data available for the selected time range
              </Typography>
            </Box>
          )}
        </Grid>

        {/* Statistics Summary */}
        {stats && (
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Statistics ({chartData.length} readings)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Metric</TableCell>
                    <TableCell align="right">Min</TableCell>
                    <TableCell align="right">Average</TableCell>
                    <TableCell align="right">Max</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      {selectedVital === 'blood_pressure' ? 'Systolic' : VITAL_SIGN_NORMAL_RANGES[selectedVital].label}
                    </TableCell>
                    <TableCell align="right">{stats.primary.min}</TableCell>
                    <TableCell align="right">{stats.primary.avg}</TableCell>
                    <TableCell align="right">{stats.primary.max}</TableCell>
                  </TableRow>
                  {stats.secondary && (
                    <TableRow>
                      <TableCell>Diastolic</TableCell>
                      <TableCell align="right">{stats.secondary.min}</TableCell>
                      <TableCell align="right">{stats.secondary.avg}</TableCell>
                      <TableCell align="right">{stats.secondary.max}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default VitalSignsTrendChart;

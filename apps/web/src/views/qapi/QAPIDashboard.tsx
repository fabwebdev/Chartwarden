'use client';

import React, { useState, useEffect, useCallback } from 'react';

// MUI Components
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';

// Icons
import {
  Refresh2,
  Chart,
  TaskSquare,
  Setting2,
  DocumentText,
  Add
} from 'iconsax-react';

// Project Imports
import MainCard from 'components/MainCard';
import MetricsOverview from './components/MetricsOverview';
import InitiativesList from './components/InitiativesList';
import MetricDefinitionsList from './components/MetricDefinitionsList';
import FiltersPanel from './components/FiltersPanel';
import CreateInitiativeDialog from './components/CreateInitiativeDialog';

// API
import {
  getAllMetricDefinitions,
  getAllInitiatives,
  getMetricValues,
  getMetricAggregations
} from '../../api/qapi';

// Types
import type {
  MetricDefinition,
  ImprovementInitiative,
  MetricValue,
  MetricAggregation,
  InitiativeFilters,
  MetricDefinitionFilters
} from '../../types/qapi';

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

const QAPIDashboard: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [metricDefinitions, setMetricDefinitions] = useState<MetricDefinition[]>([]);
  const [initiatives, setInitiatives] = useState<ImprovementInitiative[]>([]);
  const [metricValues, setMetricValues] = useState<MetricValue[]>([]);
  const [metricAggregations, setMetricAggregations] = useState<MetricAggregation[]>([]);

  // Dialog state
  const [createInitiativeOpen, setCreateInitiativeOpen] = useState(false);

  // Filter state
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Fetch all data
  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);

      const initiativeFilters: InitiativeFilters = {
        status: selectedStatuses.length > 0 ? selectedStatuses[0] as any : undefined,
        start_date: dateRange.start,
        end_date: dateRange.end
      };

      const metricFilters: MetricDefinitionFilters = {
        category: selectedCategories.length > 0 ? selectedCategories[0] as any : undefined,
        is_active: true
      };

      const [
        metricsResponse,
        initiativesResponse,
        valuesResponse,
        aggregationsResponse
      ] = await Promise.all([
        getAllMetricDefinitions(metricFilters),
        getAllInitiatives(initiativeFilters),
        getMetricValues({
          start_date: dateRange.start,
          end_date: dateRange.end
        }),
        getMetricAggregations({
          period_start: dateRange.start,
          period_end: dateRange.end
        })
      ]);

      setMetricDefinitions(metricsResponse.data || []);
      setInitiatives(initiativesResponse.data || []);
      setMetricValues(valuesResponse.data || []);
      setMetricAggregations(aggregationsResponse.data || []);
      setError(null);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number }; message?: string };
      console.error('Error fetching QAPI dashboard:', error);
      if (error.response?.status !== 401) {
        setError('Failed to load QAPI dashboard data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, selectedCategories, selectedStatuses]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle refresh
  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Handle initiative created
  const handleInitiativeCreated = () => {
    setCreateInitiativeOpen(false);
    fetchDashboardData();
  };

  // Handle filters changed
  const handleFiltersChange = (filters: {
    dateRange?: { start?: string; end?: string };
    categories?: string[];
    statuses?: string[];
  }) => {
    if (filters.dateRange) setDateRange(filters.dateRange);
    if (filters.categories) setSelectedCategories(filters.categories);
    if (filters.statuses) setSelectedStatuses(filters.statuses);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack spacing={1}>
              <Typography variant="h3">QAPI Dashboard</Typography>
              <Typography variant="body2" color="text.secondary">
                Quality Assurance and Performance Improvement System
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh} disabled={refreshing}>
                  <Refresh2 size={20} className={refreshing ? 'rotating' : ''} />
                </IconButton>
              </Tooltip>
              {activeTab === 1 && (
                <Button
                  variant="contained"
                  startIcon={<Add size={20} />}
                  onClick={() => setCreateInitiativeOpen(true)}
                >
                  New Initiative
                </Button>
              )}
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <FiltersPanel
        onFiltersChange={handleFiltersChange}
        dateRange={dateRange}
        selectedCategories={selectedCategories}
        selectedStatuses={selectedStatuses}
      />

      {/* Main Content */}
      <MainCard sx={{ mt: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={<Chart size={20} />}
            iconPosition="start"
            label="Metrics Overview"
          />
          <Tab
            icon={<TaskSquare size={20} />}
            iconPosition="start"
            label="Improvement Initiatives"
          />
          <Tab
            icon={<Setting2 size={20} />}
            iconPosition="start"
            label="Metric Definitions"
          />
          <Tab
            icon={<DocumentText size={20} />}
            iconPosition="start"
            label="Reports"
          />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <MetricsOverview
            metricDefinitions={metricDefinitions}
            metricValues={metricValues}
            metricAggregations={metricAggregations}
            onRefresh={fetchDashboardData}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <InitiativesList
            initiatives={initiatives}
            metricDefinitions={metricDefinitions}
            onRefresh={fetchDashboardData}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <MetricDefinitionsList
            metricDefinitions={metricDefinitions}
            onRefresh={fetchDashboardData}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Reports functionality coming soon
            </Typography>
          </Box>
        </TabPanel>
      </MainCard>

      {/* Create Initiative Dialog */}
      <CreateInitiativeDialog
        open={createInitiativeOpen}
        onClose={() => setCreateInitiativeOpen(false)}
        onSuccess={handleInitiativeCreated}
        metricDefinitions={metricDefinitions}
      />
    </Box>
  );
};

export default QAPIDashboard;

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Grid,
  Tab,
  Tabs,
  Typography,
  Stack,
  useMediaQuery,
  Alert,
  CircularProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { useParams } from 'next/navigation';
import AuthService from 'types/AuthService';
import Swal from 'sweetalert2';
import { ThemeMode } from 'types/config';
import {
  BereavementCasesList,
  BereavementCaseForm,
  BereavementCaseDetail,
  BereavementDashboard,
  ContactManagement,
  FollowUpTracker
} from './bereavement';
import {
  BereavementCase,
  getPatientBereavementCase
} from 'api/bereavement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
};

interface BereavementPageProps {
  patientId?: string | number;
}

const BereavementPage: React.FC<BereavementPageProps> = ({ patientId: propPatientId }) => {
  const { id } = useParams();
  const patientId = propPatientId || (Array.isArray(id) ? id[0] : id);
  const { permissions, user } = AuthService();
  const theme = useTheme();
  const matchDownSM = useMediaQuery(theme.breakpoints.down('sm'));

  const [tabValue, setTabValue] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [patientCase, setPatientCase] = useState<BereavementCase | null>(null);

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedCase, setSelectedCase] = useState<BereavementCase | null>(null);

  // Detail view state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCaseId, setDetailCaseId] = useState<number | null>(null);

  // Permission checks
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';

  const hasPermission = (permission: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  };

  const canCreate = hasPermission('create:clinical_notes') || hasPermission('create:patient');
  const canEdit = hasPermission('update:clinical_notes') || hasPermission('update:patient');

  // Fetch patient's bereavement case
  const fetchPatientCase = useCallback(async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      const response = await getPatientBereavementCase(patientId);
      const cases = response.data || [];
      // Get the active case or the most recent one
      const activeCase = cases.find((c: any) => c.case?.case_status === 'ACTIVE');
      setPatientCase(activeCase?.case || (cases.length > 0 ? cases[0].case : null));
    } catch (err: any) {
      console.error('Error fetching patient bereavement case:', err);
      setPatientCase(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatientCase();
  }, [fetchPatientCase, refreshKey]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateCase = () => {
    setSelectedCase(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEditCase = (bereavementCase: BereavementCase) => {
    setSelectedCase(bereavementCase);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleViewCase = (bereavementCase: BereavementCase) => {
    setDetailCaseId(bereavementCase.id);
    setDetailOpen(true);
  };

  const handleFormSuccess = () => {
    handleRefresh();
    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: formMode === 'create' ? 'Bereavement case created successfully!' : 'Bereavement case updated successfully!'
    });
  };

  if (!patientId) {
    return (
      <MainCard>
        <Typography color="error">Patient ID is missing</Typography>
      </MainCard>
    );
  }

  if (loading) {
    return (
      <MainCard>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  // No active case - show option to create
  if (!patientCase) {
    return (
      <>
        <MainCard>
          <MainCard
            border={false}
            content={false}
            sx={{
              padding: 3,
              bgcolor: theme.palette.mode === ThemeMode.DARK ? 'primary.700' : 'primary.lighter',
              position: 'relative',
              mb: 2
            }}
          >
            <Grid container justifyContent="space-between" alignItems="center">
              <Grid item>
                <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
                  <Stack spacing={0.75}>
                    <Typography variant="h5">Bereavement Services</Typography>
                    <Typography variant="body2" color="secondary">
                      Track grief support services for 13 months following patient death.
                    </Typography>
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
          </MainCard>

          <Box textAlign="center" py={6}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Bereavement Case Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              A bereavement case will be created when a patient passes away to track 13 months of grief support services for the family.
            </Typography>
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateCase}
              >
                Create Bereavement Case
              </Button>
            )}
          </Box>
        </MainCard>

        <BereavementCaseForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSuccess={handleFormSuccess}
          patientId={patientId}
          bereavementCase={selectedCase}
          mode={formMode}
        />
      </>
    );
  }

  return (
    <>
      <MainCard>
        {/* Header */}
        <MainCard
          border={false}
          content={false}
          sx={{
            padding: 3,
            bgcolor: theme.palette.mode === ThemeMode.DARK ? 'primary.700' : 'primary.lighter',
            position: 'relative',
            mb: 2
          }}
        >
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item>
              <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
                <Stack spacing={0.75}>
                  <Typography variant="h5">Bereavement Services</Typography>
                  <Typography variant="body2" color="secondary">
                    13-month bereavement tracking and grief support services for family members.
                  </Typography>
                </Stack>
              </Stack>
            </Grid>
            <Grid item>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                >
                  Refresh
                </Button>
                {canEdit && patientCase.case_status === 'ACTIVE' && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleEditCase(patientCase)}
                  >
                    Edit Case
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        </MainCard>

        {/* Case Status Alert */}
        {patientCase.case_status !== 'ACTIVE' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This bereavement case is <strong>{patientCase.case_status.toLowerCase()}</strong>.
            {patientCase.closure_reason && ` Reason: ${patientCase.closure_reason}`}
          </Alert>
        )}

        {/* Dashboard */}
        <Box sx={{ mb: 3 }}>
          <BereavementDashboard key={`dashboard-${refreshKey}`} caseId={patientCase.id} />
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Contacts" />
            <Tab label="Follow-ups" />
            <Tab label="Case Details" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <ContactManagement
            key={`contacts-${refreshKey}`}
            caseId={patientCase.id}
            canEdit={canEdit && patientCase.case_status === 'ACTIVE'}
            onRefresh={handleRefresh}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <FollowUpTracker
            key={`followups-${refreshKey}`}
            caseId={patientCase.id}
            canEdit={canEdit && patientCase.case_status === 'ACTIVE'}
            onRefresh={handleRefresh}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <BereavementCasesList
            key={`list-${refreshKey}`}
            patientId={patientId}
            onViewCase={handleViewCase}
            onEditCase={handleEditCase}
            onCreateCase={handleCreateCase}
            canCreate={canCreate}
            canEdit={canEdit}
          />
        </TabPanel>
      </MainCard>

      {/* Case Form Dialog */}
      <BereavementCaseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleFormSuccess}
        patientId={patientId}
        bereavementCase={selectedCase}
        mode={formMode}
      />

      {/* Case Detail Dialog */}
      <BereavementCaseDetail
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        caseId={detailCaseId}
        onRefresh={handleRefresh}
        canEdit={canEdit}
        onEdit={handleEditCase}
      />
    </>
  );
};

export default BereavementPage;

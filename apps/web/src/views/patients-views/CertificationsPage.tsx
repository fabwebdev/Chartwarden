import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Grid,
  Tab,
  Tabs,
  Typography,
  Stack,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import MainCard from 'components/MainCard';
import { useParams } from 'next/navigation';
import AuthService from 'types/AuthService';
import Swal from 'sweetalert2';
import { ThemeMode } from 'types/config';
import {
  CertificationsList,
  CertificationForm,
  CertificationDetail,
  F2FEncounterForm,
  BenefitPeriodTimeline,
  CertificationDashboard
} from './certifications';
import { Certification, signCertification } from '../../api/certification';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
};

const CertificationsPage: React.FC = () => {
  const { id } = useParams();
  const patientId = Array.isArray(id) ? id[0] : id;
  const { permissions, user } = AuthService();
  const theme = useTheme();
  const matchDownSM = useMediaQuery(theme.breakpoints.down('sm'));

  const [tabValue, setTabValue] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedCertification, setSelectedCertification] = useState<Certification | null>(null);

  // Detail view state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCertificationId, setDetailCertificationId] = useState<number | null>(null);

  // F2F form state
  const [f2fFormOpen, setF2fFormOpen] = useState(false);
  const [f2fCertification, setF2fCertification] = useState<Certification | null>(null);

  // Permission checks
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';

  const hasPermission = (permission: string): boolean => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  };

  const canCreate = hasPermission('create:clinical_notes') || hasPermission('create:patient');
  const canEdit = hasPermission('update:clinical_notes') || hasPermission('update:patient');
  const canSign = hasPermission('update:clinical_notes') || isAdmin;

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateCertification = () => {
    setSelectedCertification(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEditCertification = (certification: Certification) => {
    setSelectedCertification(certification);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleViewCertification = (certification: Certification) => {
    setDetailCertificationId(certification.id);
    setDetailOpen(true);
  };

  const handleSignCertification = async (certification: Certification) => {
    const result = await Swal.fire({
      title: 'Sign Certification',
      text: 'This action will electronically sign this certification. This cannot be undone.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sign',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      await signCertification(certification.id);
      await Swal.fire({
        icon: 'success',
        title: 'Signed',
        text: 'Certification has been signed successfully.'
      });
      handleRefresh();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to sign certification'
      });
    }
  };

  const handleFormSuccess = () => {
    handleRefresh();
    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: formMode === 'create' ? 'Certification created successfully!' : 'Certification updated successfully!'
    });
  };

  const handleF2fFormSuccess = () => {
    handleRefresh();
    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: 'Face-to-Face encounter recorded successfully!'
    });
  };

  const handleAddF2F = () => {
    setF2fCertification(null);
    setF2fFormOpen(true);
  };

  if (!patientId) {
    return (
      <MainCard>
        <Typography color="error">Patient ID is missing</Typography>
      </MainCard>
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
                  <Typography variant="h5">Benefit Periods & Certifications</Typography>
                  <Typography variant="body2" color="secondary">
                    Manage Medicare certification periods, Face-to-Face encounters, and compliance tracking.
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
                {canCreate && (
                  <>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={handleCreateCertification}
                    >
                      New Certification
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAddF2F}
                    >
                      Record F2F
                    </Button>
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>
        </MainCard>

        {/* Dashboard */}
        <Box sx={{ mb: 3 }}>
          <CertificationDashboard key={`dashboard-${refreshKey}`} patientId={patientId} />
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Certifications" />
            <Tab label="Benefit Periods" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <CertificationsList
            key={`list-${refreshKey}`}
            patientId={patientId}
            onViewCertification={handleViewCertification}
            onEditCertification={handleEditCertification}
            onCreateCertification={handleCreateCertification}
            onSignCertification={handleSignCertification}
            canCreate={canCreate}
            canEdit={canEdit}
            canSign={canSign}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <MainCard title="Benefit Period Timeline">
            <BenefitPeriodTimeline
              key={`timeline-${refreshKey}`}
              patientId={patientId}
              canCreate={canCreate}
            />
          </MainCard>
        </TabPanel>
      </MainCard>

      {/* Certification Form Dialog */}
      <CertificationForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleFormSuccess}
        patientId={patientId}
        certification={selectedCertification}
        mode={formMode}
      />

      {/* Certification Detail Dialog */}
      <CertificationDetail
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        certificationId={detailCertificationId}
        onRefresh={handleRefresh}
        canSign={canSign}
        canEdit={canEdit}
        onEdit={handleEditCertification}
      />

      {/* F2F Encounter Form Dialog */}
      <F2FEncounterForm
        open={f2fFormOpen}
        onClose={() => setF2fFormOpen(false)}
        onSuccess={handleF2fFormSuccess}
        patientId={patientId}
        certification={f2fCertification}
      />
    </>
  );
};

export default CertificationsPage;

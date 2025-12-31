import React, { useEffect, useMemo, useState } from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import MainCard from 'components/MainCard';
import { useTheme } from '@mui/material/styles';
import { useParams } from 'next/navigation';
import { createBenefitPeriod } from '../../api/patient';
import Swal from 'sweetalert2';
import AuthService from 'types/AuthService';
import http from '../../hooks/useCookie';

import { ThemeMode } from 'types/config';
import {Stack, useMediaQuery, Button } from '@mui/material';
import CarePieriodsViewer from 'components/CarePeriodsViews';
import CarePieriodsEditor from 'components/CarePeriodsEditor';
const CarePeriods = () => {
  const [value, setValue] = useState(0);
  const { id } = useParams();
  const patientId = Array.isArray(id) ? id[0] : id;
  const { permissions, user } = AuthService();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [benefitPeriods, setBenefitPeriods] = useState<any[]>([]);

  // Check if user has permission to create benefit periods
  const canCreateBenefitPeriod = () => {
    const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';
    if (isAdmin) return true;
    return permissions.includes('update:patient') || permissions.includes('create:patient');
  };

  const fetchBenefitPeriods = async () => {
    if (!patientId) return;
    try {
      setFetching(true);
      const response = await http.get(`/benefit-periods/patients/${patientId}/chart`);
      const responseData = response.data || response;
      const periods = responseData.benefitPeriods || responseData.benefit_periods || [];
      setBenefitPeriods(Array.isArray(periods) ? periods : []);
    } catch (error) {
      console.error('Error fetching benefit periods:', error);
      setBenefitPeriods([]);
    } finally {
      setFetching(false);
    }
  };

  const handleCreateBenefitPeriod = async () => {
    if (!patientId) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Patient ID is missing',
      });
      return;
    }

    try {
      setLoading(true);
      await createBenefitPeriod(patientId);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Benefit period created successfully!',
      });
      await fetchBenefitPeriods();
    } catch (error: any) {
      console.error('Error creating benefit period:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to create benefit period',
      });
    } finally {
      setLoading(false);
    }
  }; 

  useEffect(() => {
    fetchBenefitPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleChange = (event:any, newValue:any) => {
    setValue(newValue); 
  };

  const TabPanel = ({ value, index, children }: { value: number, index: number, children: React.ReactNode }) => {
    return value === index && <div>{children}</div>; 
  };
  
  
  const theme = useTheme();
  const matchDownSM = useMediaQuery(theme.breakpoints.down('sm'));

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  };

  const viewerData = useMemo(() => 
    benefitPeriods.map((period: any) => ({
      period: period.period_number ?? '-',
      location: period.location_name || period.level_of_care || 'N/A',
      start: formatDate(period.start_date),
      end: formatDate(period.end_date)
    })), [benefitPeriods]
  );

  const editorData = useMemo(() => 
    benefitPeriods.map((period: any) => ({
      period: `${period.period_number ?? '-'} / ${period.level_of_care || 'N/A'}`,
      location: period.location_name || 'N/A',
      start: formatDate(period.start_date),
      end: formatDate(period.end_date),
      billable: period.billable_days ?? '-',
      action: ''
    })), [benefitPeriods]
  );

  return (
    <MainCard title="Status / level Of Care / Location">
      <Grid container spacing={3}>
        <Grid item xs={12}>
        <MainCard
      border={false}
      content={false}
      sx={{padding:3, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'primary.700' : 'primary.lighter', position: 'relative' }}
    >
      
      <Grid container justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 5 }}>
        <Grid item>
          <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
            <Stack spacing={0.75}>
              <Typography variant="h5">{benefitPeriods.length === 0 ? 'No Benefit Periods' : 'Benefit Periods'}</Typography>
              <Typography variant="body2" color="secondary">
                {benefitPeriods.length === 0
                  ? 'Patient is admitted but has no benefit periods. You can create a benefit period here.'
                  : 'Review level of care, locations, and billable windows for each benefit period.'}
              </Typography>
            </Stack>
          </Stack>
        </Grid>
        {canCreateBenefitPeriod() && (
          <Grid item>
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleCreateBenefitPeriod}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Benefit Period'}
            </Button>
          </Grid>
        )}
      </Grid>
    </MainCard>
          <Grid sx={{mt:1 }}>
              <Tabs value={value} onChange={handleChange} aria-label="">
                <Tab label="Viewer" iconPosition="start" />
                <Tab label="Editor" iconPosition="start" />
              </Tabs>
              <TabPanel value={value} index={0}>
              <Typography>
              <MainCard
        border={false}
        content={true}
        sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'light.700' : 'light.lighter', position: 'relative' }}
      >
        <Grid container justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 5 }}>
          <Grid item>
            <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
              <Stack spacing={0.75}>
                <Typography variant="h5">Benefit Period Snapshot</Typography>
                <Typography variant="body2" color="secondary">
                 Track admission windows, locations of care, and certification periods.
                </Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid item>
            <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
              <Stack spacing={0.75}>
                <Typography variant="body1" color="secondary">
                  {fetching ? 'Refreshing...' : `${benefitPeriods.length} period(s)`}
                </Typography>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
        <CarePieriodsViewer data={viewerData} />
      </MainCard>
                </Typography>
              </TabPanel>
              <TabPanel value={value} index={1}>
                <Typography variant="h6">
                <CarePieriodsEditor data={editorData} />
                </Typography>
              </TabPanel>
            </Grid>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default CarePeriods;

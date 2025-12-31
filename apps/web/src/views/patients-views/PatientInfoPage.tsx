import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

// MATERIAL - UI
import { Tab, Tabs, Typography, Grid } from '@mui/material';
import MainCard from 'components/MainCard';
import { CalendarAdd, CardCoin, Document, Heart, Hospital, InfoCircle, Lock, Profile2User, Setting2 } from 'iconsax-react';
// PROJECT IMPORTS
import GeneralPage from './GeneralPage';
import LocationPage from './LocationPage';
import CoveragePage from './CoveragePage';
import CarePeriods from './CarePeriodsPage';
import DoseSpotAccount from './DoseSpotAccountPage';
import PatientHistory from './PatientHistoryPage';
import Demographics from './DemographicsPage';
import PatientForms from './PatientFormsPage';
import PatientPortal from './PatientPortalPage';
import SupportInformation from './SupportInformationPage';
import IdgTeam from './IdgTeamPage';
import AlertTagsPage from './AlertTagsPage';
import AuthService from 'types/AuthService';
import { getPatientById } from '../../api/patient';

const PatientInfoPage = () => {
  const [value, setValue] = useState(0);
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const { logout } = AuthService();
  const patientId = Array.isArray(id) ? id[0] : id;

  const handleChange = (event: any, newValue: any) => {
    setValue(newValue);
  };

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const response = await getPatientById(patientId);
      setPatientData(response);
    } catch (error: any) {
      console.error('Error fetching patient data:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainCard title="Patient Info">
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Tabs
            orientation="vertical"
            variant="scrollable"
            value={value}
            onChange={handleChange}
            aria-label="Vertical tabs example"
            sx={{ borderRight: 1, borderColor: 'divider' }}
          >
            <Tab
              value={0}
              label={
                <Grid container spacing={1} >
                  <Grid item>
                    <InfoCircle size={18} />
                  </Grid>
                  <Grid item>General</Grid>
                </Grid>
              }
            />
            <Tab
              value={1}
              label={
                <Grid container spacing={1} >
                  <Grid item>
                    <CardCoin size={18} />
                  </Grid>
                  <Grid item>Coverage</Grid>
                </Grid>
              }
            />
            <Tab
              value={2}
              label={
                <Grid container spacing={1} >
                  <Grid item>
                    <InfoCircle size={18} />
                  </Grid>
                  <Grid item>Location Information</Grid>
                </Grid>
              }
            />
            <Tab
              value={3}
              label={
                <Grid container spacing={1} >
                  <Grid item>
                    <Profile2User size={18} />
                  </Grid>
                  <Grid item>IDG Team</Grid>
                </Grid>
              }
            />
            <Tab
              value={4}
              label={
                <Grid container spacing={1} >
                  <Grid item>
                    <Heart size={18} />
                  </Grid>
                  <Grid item>Care periods</Grid>
                </Grid>
              }
            />
            <Tab
              value={5}
              label={
                <Grid container spacing={1} >
                  <Grid item>
                    <Hospital size={18} />
                  </Grid>
                  <Grid item>Dose Spot Account</Grid>
                </Grid>
              }
            />
            <Tab
              value={6}
              label={
                <Grid container spacing={1} >
                  <Grid item>
                    <Lock size={18} />
                  </Grid>
                  <Grid item>Patient History</Grid>
                </Grid>
              }
            />
            <Tab
              value={7}
              label={
                <Grid container spacing={1} >
                  <Grid item>
                    <Setting2 size={18} />
                  </Grid>
                  <Grid item>Support Information</Grid>
                </Grid>
              }
            />
            <Tab
              value={8}
              label={
                <Grid container spacing={1} >
                  <Grid item>
                    <Lock size={18} />
                  </Grid>
                  <Grid item>Demographics & choices</Grid>
                </Grid>
              }
            />
            <Tab
              value={9}
              label={
                <Grid container spacing={1} >
                  <Grid item>
                    <InfoCircle size={18} />
                  </Grid>
                  <Grid item>Alert Tags</Grid>
                </Grid>
              }
            />
            <Tab
              value={10}
              label={
                <Grid container spacing={1}>
                  <Grid item>
                    <Document size={18} />
                  </Grid>
                  <Grid item>Patient Forms</Grid>
                </Grid>
              }
            />
            <Tab
              value={11}
              label={
                <Grid container spacing={1} >
                  <Grid item>
                    <CalendarAdd size={18} />
                  </Grid>
                  <Grid item>Patient Portal</Grid>
                </Grid>
              }
            />
          </Tabs>
        </Grid>
        <Grid item xs={12} md={9}>
          <Typography variant="h6" component="div">
            {loading ? (
              <Typography>Loading patient data...</Typography>
            ) : (
              <>
                {value === 0 && <GeneralPage patientData={patientData} onUpdate={fetchPatientData} />}
                {value === 1 && <CoveragePage />}
                {value === 2 && <LocationPage />}
                {value === 3 && <IdgTeam />}
                {value === 4 && <CarePeriods />}
                {value === 5 && <DoseSpotAccount />}
                {value === 6 && <PatientHistory />}
                {value === 7 && <SupportInformation />}
                {value === 8 && <Demographics />}
                {value === 9 && <AlertTagsPage />}
                {value === 10 && <PatientForms />}
                {value === 11 && <PatientPortal />}
              </>
            )}
          </Typography>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default PatientInfoPage;

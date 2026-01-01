'use client';

// NEXT

// MATERIAL - UI
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

// TYPES
import { ThemeMode } from 'types/config';

// PROJECT IMPORTS
import MainCard from 'components/MainCard';
import TeamCommPage from 'views/patients-views/TeamCommPage';
import CarePlanPage from 'views/patients-views/CarePlanPage';
import PatientInfoPage from 'views/patients-views/PatientInfoPage';
import DocumentPage from 'views/patients-views/DocumentPage';

import { Collapse, Typography, useMediaQuery, useTheme } from '@mui/material';
import Avatar from 'components/@extended/Avatar';
import CerticationsPage from './CertificationsPage';
import EncountersPage from './EncountersPage';
import DoseSpotPage from './DoseSpotPage';
import MedListPage from './MedListPage';
import { MedicationsPage } from './medications';
import { useEffect, useState } from 'react';
import TrendsPage from './TrendsPage';
import HisPage from './his/HisPage';
import { useParams, useRouter } from 'next/navigation';
import http from "../../hooks/useCookie";
import IdgTeamPage2 from './IdgTeamPage2';
import AuthService from 'types/AuthService';
import LibraryPage from './LibraryPage';
import PatientChartPage from './PatientChartPage';
import GeneratePdf from './generate-pdf';
const avatarImage = '/assets/images/users';
type Props = {
  tab: string;
};

const PatientTab = ({ tab }: Props) => {
  const router = useRouter();
  const theme = useTheme();
  const { permissions, logout, user} = AuthService();
  const { id } = useParams();
  const patientId = Array.isArray(id) ? id[0] : id;
  const matchDownSM = useMediaQuery(theme.breakpoints.down('sm'));
  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    router.replace(`/patients/${newValue}`);
  };
  const [open, setOpen] = useState(false);
  
  // Check if user has admin role
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';

  const [patientData, setPatientData] = useState<any>({
    first_name: '',
    last_name: '',
    mi: '',
    preferred_name: '',
    date_of_birth: '',
    suffix: '',
    ssn: '',
    dnr_id: '',
    hipaa_received: '',
    race_ethnicity_id: '',
    liaison_primary_id: '',
    emergency_preparedness_level_id: '',
    oxygen_dependent_id: '',
    patient_consents: '',
    genders: '',
    dme_provider_id: '',
    patient_pharmacy_id: '',
    primary_diagnosis_id: ''
  });
  const handleClick = () => {
    setOpen(!open);
  };
  
  useEffect(() => {
fetchPatientDetails();
  }, []);
  const fetchPatientDetails = async () => {
    http
    .get(`/patient/${id}`)
    .then( (response: any) => {
      console.log('data',response);
      setPatientData(response.data);
    })
    .catch((error) => {
      if(error.response.status === 401){
        logout();
      }
    });
    
};

const hasPermission = (permissionName: string) => {
  // Admin users have all permissions
  if (isAdmin) {
    return true;
  }
  return permissions.includes(permissionName);
};

// Check if user has access to patient charts (clinical notes)
const hasPatientChartsAccess = () => {
  if (isAdmin) {
    return true;
  }
  // Check for both old permission format and new format (view:clinical_notes)
  return hasPermission('patient_charts_secondary_menu') ||
         hasPermission('view:clinical_notes') ||
         hasPermission('create:clinical_notes') ||
         hasPermission('update:clinical_notes');
};

// Check if user has access to patient info
const hasPatientInfoAccess = () => {
  if (isAdmin) {
    return true;
  }
  // Check for both old permission format and new format (view:patient)
  return hasPermission('patient_info_secondary_menu') ||
         hasPermission('view:patient') ||
         hasPermission('update:patient');
};

  return (
    <>
      <MainCard
        border={true}
        content={true}
        sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'light.700' : 'light.lighter', position: 'relative' }}
      >
        <Grid container justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 5 }}>
          <Grid item>
            <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
              <Stack spacing={2.5} alignItems="center">
                <Avatar alt="Avatar 1" size="xl" src={`${avatarImage}/avatar-6.png`} />
              </Stack>
              <Stack spacing={0.75}>
                <Typography variant="h5">{patientData.first_name}</Typography>
                <Typography variant="body2" color="secondary">
                  DOB: {patientData.date_of_birth}
                </Typography>
                <Typography variant="body2" color="secondary">
                  Dx Complete your profile to unlock all features
                </Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid item>
            <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
              <Stack spacing={0.75}>
                <Typography variant="body1" color="secondary">
                  Status: Admitted
                </Typography>
                <Typography variant="body2" color="secondary">
                  ReCert: Complete your profile to unlock all features
                </Typography>
                <Typography variant="body2" color="secondary">
                  Dx Complete your profile to unlock all features
                </Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid item sx={{ mx: matchDownSM ? 2 : 3, my: matchDownSM ? 1 : 0, mb: matchDownSM ? 2 : 0 }} xs={matchDownSM ? 12 : 'auto'}>
          
      <Button onClick={handleClick} variant="outlined"  sx={{ border: '1px solid #fafafa', borderRadius: '5px' }}>
        {open ? 'collapse' : 'Expand'}
      </Button>
            
          </Grid>
        </Grid>
        <Grid>
    <Collapse in={open}>
        <Typography>
        <Grid container justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 5 }}>
          <Grid item>
            <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
              <Stack spacing={0.75}>
                <Typography variant="body2" color="secondary">
                  DOB: 10/12/1942
                </Typography>
                <Typography variant="body2" color="secondary">
                Allergy to aller tesr - tttg.
                Adverse reaction to Allergy D-12(obsolete) - hhhhh.
                </Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid item>
            <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
              <Stack spacing={0.75}>
                <Typography variant="body1" color="secondary">
                  Status: Admitted
                </Typography>
                <Typography variant="body2" color="secondary">
                  ReCert: Complete your profile to unlock all features
                </Typography>
                <Typography variant="body2" color="secondary">
                  Dx Complete your profile to unlock all features
                </Typography>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
        </Typography>
      </Collapse>
    </Grid>
      </MainCard>
      <MainCard border={false} sx={{ mt: 2.5 }}>
  <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
    <Tabs value={tab.split('/')[0]} onChange={handleChange} variant="scrollable" scrollButtons="auto" aria-label="account profile tab">
      {hasPermission('team_comm_secondary_menu') && 
        <Tab label="Team Comm" value={`teamComm/${id}`} iconPosition="start" sx={{ color: tab.startsWith('teamComm') ? 'primary.main' : 'inherit' }} />
      }
      {hasPermission('trends_secondary_menu') && 
        <Tab label="Trends" value={`trends/${id}`} iconPosition="start" sx={{ color: tab.startsWith('trends') ? 'primary.main' : 'inherit' }} />
      }
      {hasPermission('hope_secondary_menu') && 
        <Tab label="Hope" value={`hope/${id}`} iconPosition="start" sx={{ color: tab.startsWith('hope') ? 'primary.main' : 'inherit' }} />
      }
      {hasPermission('encounters_secondary_menu') && 
        <Tab label="Encounters" value={`encounters/${id}`} iconPosition="start" sx={{ color: tab.startsWith('encounters') ? 'primary.main' : 'inherit' }} />
      }
      {hasPermission('care_plan_secondary_menu') && 
        <Tab label="Care Plan" value={`care-plan/${id}`} iconPosition="start" sx={{ color: tab.startsWith('care-plan') ? 'primary.main' : 'inherit' }} />
      }
      {hasPatientInfoAccess() && 
        <Tab label="Patient Info" value={`patient-info/${id}`} iconPosition="start" sx={{ color: tab.startsWith('patient-info') ? 'primary.main' : 'inherit' }} />
      }
      {hasPermission('idg_team_secondary_menu') && 
        <Tab label="IDG Team" value={`idg-team/${id}`} iconPosition="start" sx={{ color: tab.startsWith('idg-team') ? 'primary.main' : 'inherit' }} />
      }
      {hasPermission('documents_secondary_menu') && 
        <Tab label="Documents" value={`documents/${id}`} iconPosition="start" sx={{ color: tab.startsWith('documents') ? 'primary.main' : 'inherit' }} />
      }
      {hasPermission('library_secondary_menu') && 
        <Tab label="Library" value={`library/${id}`} iconPosition="start" sx={{ color: tab.startsWith('library') ? 'primary.main' : 'inherit' }} />
      }
      {hasPermission('certifications_secondary_menu') && 
        <Tab label="Certifications" value={`certifications/${id}`} iconPosition="start" sx={{ color: tab.startsWith('certifications') ? 'primary.main' : 'inherit' }} />
      }
      {hasPermission('med_list_secondary_menu') &&
        <Tab label="Med List" value={`med-list/${id}`} iconPosition="start" sx={{ color: tab.startsWith('med-list') ? 'primary.main' : 'inherit' }} />
      }
      {hasPermission('medications_secondary_menu') &&
        <Tab label="Medications" value={`medications/${id}`} iconPosition="start" sx={{ color: tab.startsWith('medications') ? 'primary.main' : 'inherit' }} />
      }
      {hasPermission('dose_spot_secondary_menu') && 
        <Tab label="Dose Spot" value={`dose-spot/${id}`} iconPosition="start" sx={{ color: tab.startsWith('dose-spot') ? 'primary.main' : 'inherit' }} />
      }
      {hasPatientChartsAccess() && 
        <Tab label="Patient Charts" value={`patient_chart/${id}`} iconPosition="start" sx={{ color: tab.startsWith('patient_chart') ? 'primary.main' : 'inherit' }} />
      }

      
      {/* <Tab label="Generate PDF" value={`generate_pdf`} iconPosition="start"  sx={{ color: tab.startsWith('generate_pdf') ? 'primary.main' : 'inherit' }}/> */}
    </Tabs>
  </Box>
  <Box sx={{ mt: 2.5 }}>
    {tab.startsWith('teamComm') && <TeamCommPage />}
    {tab.startsWith('trends') && <TrendsPage />}
    {tab.startsWith('hope') && <HisPage id={patientId} />}
    {tab.startsWith('encounters') && <EncountersPage patientId={patientId} />}
    {tab.startsWith('care-plan') && <CarePlanPage />}
    {tab.startsWith('patient-info') && <PatientInfoPage />}
    {tab.startsWith('idg-team') && <IdgTeamPage2 />}
    {tab.startsWith('documents') && <DocumentPage />}
    {tab.startsWith('library') && <LibraryPage />}
    {tab.startsWith('certifications') && <CerticationsPage />}
    {tab.startsWith('med-list') && <MedListPage />}
    {tab.startsWith('dose-spot') && <DoseSpotPage />}
    {/* {tab.startsWith('generate_pdf') && <GeneratePdf />} */}
    {tab.startsWith('patient_chart') && <PatientChartPage id={patientId}/>} 
  </Box>
</MainCard>


    </>
  );
};

export default PatientTab;

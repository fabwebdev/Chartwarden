import { useEffect, useState } from 'react';

// MATERIAL - UI
import { Tab, Tabs, Typography, Grid, Button } from '@mui/material';
import MainCard from 'components/MainCard';
// PROJECT IMPORTS
import AdministrativeInformationPage from './AdministrativeInformationPage';
import DischargePage from './Discharge';
import PatientHistoryDiagnosesPage from './PatientHistoryDiagnoses';
import SpiritualExistentialPage from './SpiritualExistentialPage';
import SupportiveAssistancePage from './SupportiveAssistancePage';
import NeuroBehavioralPage from './NeuroBehavioralPage';
import SensoryPage from './SensoryPage';
import PainPage from './PainPage';
import RespiratoryPage from './RespiratoryPage';
import CardiacPage from './CardiacPage';
import EliminationPage from './EliminationPage';
import FunctionalPage from './FunctionalPage';
import EndocrinePage from './EndocrinePage';
import HematologicalPage from './HematologicalPage';
import IntegumentaryPage from './Integumentary';
import NutritionPage from './NutritionPage';
import MedicationPage from './MedicationsPage';
import SummaryPage from './SummaryPage';
import AdvanceCarePlanningPage from './AdvanceCarePlanningPage';
import AuthService from 'types/AuthService';

const HisPage = ({ id }: { id: string }) => {
  const { permissions, user } = AuthService();
  const [value, setValue] = useState(0);

  const handleChange = (event: any, newValue: any) => {
    setValue(newValue);
  };
  useEffect(() => {
  console.log("hispage",id);
  
  }, []);
  const handleGeneratePdf = async () => {
    try {
      const response = await fetch('/api/his-pdf/generate-his-pdf');
      if (!response.ok) {
        console.error('Error fetching PDF:', response.statusText);
        return;
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };
  
  // Check if user has admin role
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';
  
  const hasPermission = (permissionName: string) => {
    // Admin users have all permissions
    if (isAdmin) {
      return true;
    }
    return permissions.includes(permissionName);
  }

  // Check if user has access to medications (supports both old and new format)
  const hasMedicationsAccess = (tab: any) => {
    // Admin users have access to all tabs
    if (isAdmin) {
      return true;
    }
    if (tab.permission === 'medications_hope_tertiary_menu') {
      return hasPermission('medications_hope_tertiary_menu') || 
             hasPermission('view:medications');
    }
    return hasPermission(tab.permission);
  }
  return (
    <MainCard title="Hospice Item Set">
      <Button variant="contained" color="primary" onClick={handleGeneratePdf}>
        Download PDF
      </Button>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          {(isAdmin || hasPermission('hope_secondary_menu')) && (
            <Tabs
              orientation="vertical"
              variant="scrollable"
              value={value}
              onChange={handleChange}
              aria-label="Vertical Tabs"
              sx={{ borderRight: 1, borderColor: 'divider' }}
            >
              {/* Tableau des onglets avec permissions dynamiques */}
              {[
                {
                  id: 0,
                  label: 'Administrative Information',
                  permission: 'administrative_information_hope_tertiary_menu',
                },
                {
                  id: 1,
                  label: 'Discharge',
                  permission: 'discharge_hope_tertiary_menu',
                },
                {
                  id: 2,
                  label: 'Patient History & Diagnoses',
                  permission: 'patient_history_diagnoses_hope_tertiary_menu',
                },
                {
                  id: 3,
                  label: 'Advance Care Planning',
                  permission: 'advance_exitential_hope_tertiary_menu',
                },
                {
                  id: 4,
                  label: 'Spiritual / Existential',
                  permission: 'spiritual_existential_hope_tertiary_menu',
                },
                {
                  id: 5,
                  label: 'Supportive Assistance',
                  permission: 'supportive_assistance_hope_tertiary_menu',
                },
                {
                  id: 6,
                  label: 'Neuro / Behavioral',
                  permission: 'neuro_behavioral_hope_tertiary_menu',
                },
                {
                  id: 7,
                  label: 'Sensory',
                  permission: 'sensory_hope_tertiary_menu',
                },
                {
                  id: 8,
                  label: 'Pain',
                  permission: 'pain_hope_tertiary_menu',
                },
                {
                  id: 9,
                  label: 'Respiratory',
                  permission: 'respiratory_hope_tertiary_menu',
                },
                {
                  id: 10,
                  label: 'Cardiac',
                  permission: 'cardiac_hope_tertiary_menu',
                },
                {
                  id: 11,
                  label: 'Elimination',
                  permission: 'elimination_hope_tertiary_menu',
                },
                {
                  id: 12,
                  label: 'Functional',
                  permission: 'functional_hope_tertiary_menu',
                },
                {
                  id: 13,
                  label: 'Endocrine',
                  permission: 'endocrine_hope_tertiary_menu',
                },
                {
                  id: 14,
                  label: 'Hematological',
                  permission: 'hematological_hope_tertiary_menu',
                },
                {
                  id: 15,
                  label: 'Integumentary',
                  permission: 'integumentary_hope_tertiary_menu',
                },
                {
                  id: 16,
                  label: 'Nutrition',
                  permission: 'nutrition_hope_tertiary_menu',
                },
                {
                  id: 17,
                  label: 'Medications',
                  permission: 'medications_hope_tertiary_menu',
                },
                {
                  id: 18,
                  label: 'Summary',
                  permission: 'summary_hope_tertiary_menu',
                },
              ]
                .filter((tab) => hasMedicationsAccess(tab)) // Filtrer les onglets avec les permissions
                .map((tab) => (
                  <Tab
                    key={tab.id}
                    value={tab.id}
                    label={
                      <Grid container spacing={1} alignItems="center">
                        <Grid item>{tab.label}</Grid>
                      </Grid>
                    }
                  />
                ))}
            </Tabs>
          )}
        </Grid>
        <Grid item xs={12} md={9}>
          <Typography variant="h6" component="div">
            {value === 0 && <AdministrativeInformationPage id={id} />}
            {value === 1 && <DischargePage id={id} />}
            {value === 2 && <PatientHistoryDiagnosesPage id={id} />}
            {value === 3 && <AdvanceCarePlanningPage id={id} />}
            {value === 4 && <SpiritualExistentialPage id={id} />}
            {value === 5 && <SupportiveAssistancePage id={id} />}
            {value === 6 && <NeuroBehavioralPage />}
            {value === 7 && <SensoryPage />}
            {value === 8 && <PainPage id={id} />}
            {value === 9 && <RespiratoryPage />}
            {value === 10 && <CardiacPage id={id} />}
            {value === 11 && <EliminationPage />}
            {value === 12 && <FunctionalPage />}
            {value === 13 && <EndocrinePage id={id} />}
            {value === 14 && <HematologicalPage id={id} />}
            {value === 15 && <IntegumentaryPage id={id} />}
            {value === 16 && <NutritionPage id={id} />}
            {value === 17 && <MedicationPage />}
            {value === 18 && <SummaryPage />}
          </Typography>
        </Grid>
      </Grid>
    </MainCard>
  );
  
};

export default HisPage;

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`vertical-tabpanel-${index}`} aria-labelledby={`vertical-tab-${index}`} {...other}>
      {value === index && (
        <Typography component="div" sx={{ p: 3 }}>
          {children}
        </Typography>
      )}
    </div>
  );
}

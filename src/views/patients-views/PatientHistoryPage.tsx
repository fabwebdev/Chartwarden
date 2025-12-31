import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// ASSETS
import { Tab, Tabs } from '@mui/material';
import MainCard from 'components/MainCard';
import { useState } from 'react';
import PatientHistoryAllergy from 'components/PatientHistoryAllergy';
import PatientHistoryDiagnoses from 'components/PatientHistoryDiagnoses';
import PatientHistoryMedications from 'components/PatientHistoryMedications';

// ==============================|| ACCOUNT PROFILE - BASIC ||============================== //

const PatientHistory = () => {
  const [value, setValue] = useState(0); // State for the active tab

  const handleChange = (event: any, newValue: any) => {
    setValue(newValue); // Function to handle tab change
  };

  const TabPanel = ({ value, index, children }: { value: number; index: number; children: React.ReactNode }) => {
    return value === index && <div>{children}</div>; // Component to render tab content
  };

  return (
    <MainCard title="Patient History">
      <Grid>
        <Grid item xs={12}>
          <Tabs value={value} onChange={handleChange} aria-label="">
            <Tab label="Allergies" iconPosition="start" />
            <Tab label="Diagnoses" iconPosition="start" />
            <Tab label="Medications" iconPosition="start" />
          </Tabs>
          <TabPanel value={value} index={0}>
            <Typography>
            <PatientHistoryAllergy/>
            </Typography>
          </TabPanel>
          <TabPanel value={value} index={1}>
            <Typography>
            <PatientHistoryDiagnoses/>
              </Typography>
          </TabPanel>
          <TabPanel value={value} index={2}>
            <Typography>
            <PatientHistoryMedications/>
            </Typography>
          </TabPanel>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default PatientHistory;

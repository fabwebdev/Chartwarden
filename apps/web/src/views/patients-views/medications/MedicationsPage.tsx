import { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { MedicineBox, TableDocument, Diagram } from 'iconsax-react';

import MedicationList from './MedicationList';
import MedicationAdministrationRecord from './MedicationAdministrationRecord';
import MedicationReconciliation from './MedicationReconciliation';

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
      id={`medication-tabpanel-${index}`}
      aria-labelledby={`medication-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `medication-tab-${index}`,
    'aria-controls': `medication-tabpanel-${index}`
  };
}

interface MedicationsPageProps {
  patientId: string | number;
}

const MedicationsPage = ({ patientId }: MedicationsPageProps) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="medication management tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            icon={<MedicineBox size={20} />}
            iconPosition="start"
            label="Medication Orders"
            {...a11yProps(0)}
          />
          <Tab
            icon={<TableDocument size={20} />}
            iconPosition="start"
            label="Administration Record (MAR)"
            {...a11yProps(1)}
          />
          <Tab
            icon={<Diagram size={20} />}
            iconPosition="start"
            label="Reconciliation"
            {...a11yProps(2)}
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <MedicationList patientId={patientId} />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <MedicationAdministrationRecord patientId={patientId} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <MedicationReconciliation patientId={patientId} />
      </TabPanel>
    </Box>
  );
};

export default MedicationsPage;

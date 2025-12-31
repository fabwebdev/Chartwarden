// PROJECT IMPORTS
import {Grid, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useMemo } from 'react';
import StickyTable from 'sections/tables/react-table/StickyTable';
import MainCard from './MainCard';

const PatientHistoryDiagnoses = () => {


  const theme = useTheme();
  const matchDownSM = useMediaQuery(theme.breakpoints.down('sm'));
  const columns = useMemo(
    () => [
      {
        Header: 'Diagnosis',
        accessor: 'name',
        sticky: 'left',
      },
      {
        Header: 'Status',
        accessor: 'status',
        sticky: 'left',
      },
    ],
    []
  );
  return (
    <>
 <MainCard
      border={false}
      content={false}
      sx={{mt:3 }}
    >
      
      <Grid  container justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 5 }}>
        <Grid item >
          <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
            <Stack spacing={0.75}>
              <Typography variant="body1" color="secondary">
              Enter diagnoses included in the patient's medical history here. Note that this interface will not create active hospice-related diagnoses? Diagnoses added to this list will be dispayed in the patient's care plan with a "historical" label. Approved clinical users may then mark thes diagnoses as active hospuce-related problems as appropriate.
              </Typography>
              <Typography variant="h5" sx={{mt:1}} color="error">Do not add "Z74.1 Need for assistance with personal care", "Z74.1 OLthers specified counseling" or "Z74.1 Spiritual or religious counseling" here.</Typography>
           
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </MainCard>
      <Grid item xs={12} sx={{mt:3}}>
          <StickyTable columns={columns} data={[]} />
        </Grid>
    </>
  );
};

export default PatientHistoryDiagnoses;

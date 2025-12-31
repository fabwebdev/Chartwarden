// PROJECT IMPORTS
import {Button, Grid, Link, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useMemo } from 'react';
import StickyTable from 'sections/tables/react-table/StickyTable';
import MainCard from './MainCard';
import { ThemeMode } from 'types/config';

const PatientHistoryMedications = () => {



  const theme = useTheme();
  const matchDownSM = useMediaQuery(theme.breakpoints.down('sm'));
  const columns = useMemo(
    () => [
      {
        Header: 'Drug Name,Strength,Form',
        accessor: 'name',
        sticky: 'left',
        width: 150
      },
      {
        Header: 'Status',
        accessor: 'status',
        sticky: 'left',
        width: 120,
      },
      {
        Header: 'Directions',
        accessor: '',
        width: 120
      },
      {
        Header: 'Associated Dx',
        accessor: '',
        width: 200
      },
    ],
    []
  );
  return (
    <>
 <MainCard
      border={false}
      content={false}
      sx={{padding:3,mt:3, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'primary.200' : 'primary.lighter', position: 'relative' }}
    >
      
      <Grid  container justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 5 }}>
        <Grid item >
          <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
            <Stack spacing={0.75}>
              <Typography variant="h5">This interface create Patient-Reported medications</Typography>
              <Typography variant="body1" color="secondary">
                  Will Not create medication orders / documents
              </Typography>
              <Typography variant="body1" color="secondary">
                  Will be displayed in the patient's Med list and Care Plan
              </Typography>
              <Typography variant="body1" color="secondary">
                 Meds can be filled or removed by approved clinical users
              </Typography>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </MainCard>
    <Grid sx={{mt:2}}>
    <Button variant="contained" component={Link} href="#">
              Add New Medication
            </Button>
    </Grid>
      <Grid item xs={12} sx={{mt:3}}>
          <StickyTable columns={columns} data={[]} />
        </Grid>
    </>
  );
};

export default PatientHistoryMedications;

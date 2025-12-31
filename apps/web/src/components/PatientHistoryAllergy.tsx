// PROJECT IMPORTS
import {Grid, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useMemo } from 'react';
import StickyTable from 'sections/tables/react-table/StickyTable';
import MainCard from './MainCard';
import { ThemeMode } from 'types/config';

const PatientHistoryAllergy = () => {
// State for the active tab
  const theme = useTheme();
  const matchDownSM = useMediaQuery(theme.breakpoints.down('sm'));
  const columns = useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'name',
        sticky: 'left',
        width: 150
      },
      {
        Header: 'Type',
        accessor: 'location',
        sticky: 'left',
        width: 120,
        defaultCanSort: true
      },
      {
        Header: 'Reaction',
        accessor: '',
        width: 120
      },
      {
        Header: 'Onset',
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
      sx={{padding:3,mt:3, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'error.200' : 'error.lighter', position: 'relative' }}
    >
      
      <Grid  container justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 5 }}>
        <Grid item >
          <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
            <Stack spacing={0.75}>
              <Typography variant="h5">No Allergies Information</Typography>
              <Typography variant="body1" color="secondary">
                  you haven't entered any patient allergy information. 
                  if patient doesn't have any allergies; add No Known Allergies record. A Dose Spot Account must be created before adding any allergy information.
              </Typography>
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

export default PatientHistoryAllergy;


// PROJECT IMPORTS
import {Grid, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import MainCard from 'components/MainCard';
import { useMemo } from 'react';
import StickyTable from 'sections/tables/react-table/StickyTable';

const PatientForms = () => {
  const theme = useTheme();
  const matchDownSM = useMediaQuery(theme.breakpoints.down('sm'));
  const columns = useMemo(
    () => [
      {
        Header: 'Title',
        accessor: 'title',
        sticky: 'left',
      },
      {
        Header: 'Description',
        accessor: 'description',
        sticky: 'left',
      },
      {
        Header: 'Signed Documents',
        accessor: '',
      },
    ],
    []
  );
  return (
    <>
 <MainCard
 title="Patient Forms"    
    >
       <Grid item >
          <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
            <Stack spacing={0.75}>
              <Typography variant="body1" color="secondary">
              The forms below are CMS or national association-driven templates thats have been pre-filled data. Hospices may use these forms or internal/proprietary forms. Note that hospics should only use these forms AFTER a patient has been fully admitted and a care plan has been established.
               </Typography>
                </Stack>
          </Stack>
        </Grid>
      <Grid item xs={12} sx={{mt:3}}>
          <StickyTable columns={columns} data={[]} />
        </Grid>
     
    </MainCard>
    </>
  );
};

export default PatientForms;

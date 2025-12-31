
// PROJECT IMPORTS
import {Button, Grid, Typography } from '@mui/material';
import MainCard from 'components/MainCard';
import { useMemo } from 'react';
import StickyTable from 'sections/tables/react-table/StickyTable';
const EncountersPage = () => {
  const columns = useMemo(
    () => [
      {
        Header: 'Type',
        accessor: 'type',
        sticky: 'left',
      },
      {
        Header: 'Author',
        accessor: 'Author',
        sticky: 'left',
      },
      {
        Header: 'Satrt Date',
        accessor: 'satrt_date',
        sticky: 'left',
      },
      {
        Header: 'End Date',
        accessor: 'end_date',
        sticky: 'left',
      },
      {
        Header: 'Status',
        accessor: 'Status',
        sticky: 'left',
      },
      {
        Header: 'Action ',
        accessor: 'action',
        sticky: 'left',
      },
      
      
    ],
    []
  );
  return (
    <>
 <MainCard>
  <Grid container alignItems="center">
    <Grid item xs={6}> {/* Colonne pour le titre */}
      <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
        Encounters
      </Typography>
    </Grid>
    <Grid item xs={6} textAlign="right"> {/* Colonne pour le bouton */}
      <Button variant="contained" color="inherit" sx={{ border: '1px solid #fafafa', borderRadius: '5px' }}>
       Calendar
      </Button>
    </Grid>
    <Grid item xs={12} sx={{ mt: 3 }}> {/* Colonne pour le contenu */}
      <StickyTable columns={columns} data={[]} />
    </Grid>
  </Grid>
</MainCard>

    </>
  );
};

export default EncountersPage;
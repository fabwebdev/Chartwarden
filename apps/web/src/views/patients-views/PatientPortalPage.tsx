// PROJECT IMPORTS
import {Grid } from '@mui/material';
import MainCard from 'components/MainCard';
import { useMemo } from 'react';
import StickyTable from 'sections/tables/react-table/StickyTable';

const PatientPortal = () => {
  const columns = useMemo(
    () => [
      {
        Header: 'Name',
        accessor: 'name',
        sticky: 'left',
      },
      {
        Header: 'Type',
        accessor: 'type',
        sticky: 'left',
      },
      {
        Header: 'Status',
        accessor: '',
      },
    ],
    []
  );
 
  return (
    <>
 <MainCard
 title="Patient Portal Access"    
    >
      <Grid item xs={12} sx={{mt:3}}>
          <StickyTable columns={columns} data={[]} />
        </Grid>
     
    </MainCard>
    </>
  );
};

export default PatientPortal;

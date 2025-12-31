// PROJECT IMPORTS
import {Grid } from '@mui/material';
import { useMemo } from 'react';
import StickyTable from 'sections/tables/react-table/StickyTable';

interface CarePeriodsViewerProps {
  data: Record<string, any>[];
}

const CarePieriodsViewer = ({ data }: CarePeriodsViewerProps) => {
  const columns = useMemo(
    () => [
      {
        Header: 'Period #',
        accessor: 'period',
        sticky: 'left',
        width: 80
      },
      {
        Header: 'Location',
        accessor: 'location',
        sticky: 'left',
        width: 120,
        defaultCanSort: true
      },
      {
        Header: 'Start',
        accessor: 'start',
        width: 140
      },
      {
        Header: 'End',
        accessor: 'end',
        width: 140
      },
    ],
    []
  );
  return (
      <Grid item xs={12} sx={{mt:3}}>
          <StickyTable columns={columns} data={data} />
        </Grid>
  );
};

export default CarePieriodsViewer;

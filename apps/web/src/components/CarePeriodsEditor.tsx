// PROJECT IMPORTS
import { Grid } from '@mui/material';
import { useMemo } from 'react';
import StickyTable from 'sections/tables/react-table/StickyTable';

interface CarePeriodsEditorProps {
  data: Record<string, any>[];
}

const CarePieriodsEditor = ({ data }: CarePeriodsEditorProps) => {
  const columns = useMemo(
    () => [
      {
        Header: 'Period # / LOC',
        accessor: 'period',
        sticky: 'left',
        width: 150
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
        width: 120
      },
      {
        Header: 'End',
        accessor: 'end',
        width: 120
      },
      {
        Header: 'Billable',
        accessor: 'billable',
        width: 120
      },
      {
        Header: 'Actions',
        accessor: 'action',
        width: 120
      },
    ],
    []
  );
  return (
      <Grid item xs={12} sx={{mt:1 }}>
          <StickyTable columns={columns} data={data} />
        </Grid>
  );
};

export default CarePieriodsEditor;

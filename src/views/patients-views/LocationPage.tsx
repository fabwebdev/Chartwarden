// PROJECT IMPORTS
import MainCard from 'components/MainCard';
import { Grid, Stack, InputLabel, TextField, MenuItem, Select } from '@mui/material';

import { useMemo } from 'react';
import StickyTable from 'sections/tables/react-table/StickyTable';

const LocationPage = () => {
  const columns = useMemo(
    () => [
      {
        Header: 'Facility Name',
        Footer: '#',
        accessor: 'id',
        sticky: 'left',
        width: 50
      },
      {
        Header: 'Street Address',
        accessor: 'street',
        sticky: 'left',
        width: 120,
        defaultCanSort: true
      },
      {
        Header: 'City',
        accessor: 'city',
        width: 120
      },
      {
        Header: 'State',
        accessor: 'state',
        width: 200
      },

      {
        Header: 'Zip',
        accessor: 'zip'
      },
      {
        Header: 'Office Phone',
        className: 'cell-center',
        disableSortBy: true
      }
    ],
    []
  );
  return (
    <Grid item xs={12}>
      <MainCard title="Location #1" sx={{ mb: 2.5 }}>
        <Grid container spacing={3} sx={{ mb: 2.5 }}>
          <Grid item xs={12} sm={6} md={8}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="Facility">* Facility</InputLabel>
              <Select fullWidth id="Consents" value="1">
                <MenuItem value="1">Facility 1 (Eagle, 1313 North Way)</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </Select>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="room">* Room Number</InputLabel>
              <TextField fullWidth defaultValue="2" id="room" placeholder="room" autoFocus />
            </Stack>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <StickyTable columns={columns} data={[]} />
        </Grid>
      </MainCard>
    </Grid>
  );
};

export default LocationPage;

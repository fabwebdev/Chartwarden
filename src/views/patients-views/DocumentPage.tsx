// PROJECT IMPORTS
import { FormControl, FormControlLabel, Grid, Radio, RadioGroup } from '@mui/material';
import MainCard from 'components/MainCard';
import { useMemo } from 'react';
import StickyTable from 'sections/tables/react-table/StickyTable';

const DocumentPage = () => {
  const columns = useMemo(
    () => [
      {
        Header: 'Type',
        Footer: '',
        accessor: 'type',
        sticky: 'left',
        width: 50
      },
      {
        Header: 'Title',
        accessor: 'title',
        sticky: 'left',
        width: 120,
        defaultCanSort: true
      },
      {
        Header: 'Author',
        accessor: 'Description',
        width: 120
      },
      {
        Header: 'Date Signed',
        accessor: 'signed',
        width: 200
      },

      {
        Header: 'Date Uploaded',
        accessor: 'uploaded'
      },
     
    ],
    []
  );
  return (
    <MainCard title="Document">
      <FormControl component="fieldset">
        <RadioGroup aria-label="size" name="radio-buttons-group" row>
          <FormControlLabel value="primary" defaultValue="success" control={<Radio />} label="General" />
          <FormControlLabel value="secondary" control={<Radio color="secondary" />} label="Uploaded" />
          <FormControlLabel value="success" control={<Radio color="success" />} label="Encounters" />
          <FormControlLabel value="warning" control={<Radio color="warning" />} label="CTI" />
          <FormControlLabel value="info" control={<Radio color="info" />} label="IDG" />
          <FormControlLabel value="error" control={<Radio color="error" />} label="Oders" />
          <FormControlLabel value="warning" control={<Radio color="warning" />} label="Mers" />
        </RadioGroup>
      </FormControl>

      <Grid item xs={12}>
          <StickyTable columns={columns} data={[]} />
        </Grid>
    </MainCard>
  );
};

export default DocumentPage;

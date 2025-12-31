import React from 'react';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import MainCard from 'components/MainCard';
import { Stack } from '@mui/material';

// Assume you have these icons imported

const DoseSpotAccount = () => {

  return (
    <MainCard title="Dose Spot Patient Account">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Stack>
            <Typography variant="h6">Dose Spot Patient ID : 132377378</Typography>
            <Typography variant="h6">Mediction synchronized : 03/18/2024 16:09</Typography>
            <Typography variant="h6">Account synchronized :  03/17/2024 07:09</Typography>
          </Stack>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default DoseSpotAccount;

import React from 'react';
import { Grid, Typography } from '@mui/material';

const LibraryPage = () => {
  return (
    <Grid
      container
      spacing={0}
      direction="column"
      alignItems="center"
      justifyContent="center"
      style={{ minHeight: '100px' }}
    >
      <Grid item xs={3}>
        <Typography variant="h5" align="center">
        Library Page
        </Typography>
      </Grid>
    </Grid>
  );
}

export default LibraryPage;

import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';




// ASSETS
import { Button } from '@mui/material';

// ==============================|| ACCOUNT PROFILE - BASIC ||============================== //

const TeamCommPage = () => {

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={5} md={4}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
          <Typography variant="h2" sx={{ mb: 2.5 }}>Team Communication</Typography>
          <Button variant="contained"  component={Link} href="/">
                New comment
              </Button>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default TeamCommPage;

import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';

// ASSETS
import { Button, InputLabel, Stack, TextField } from '@mui/material';
import MainCard from 'components/MainCard';

// ==============================|| ACCOUNT PROFILE - BASIC ||============================== //

const AlertTagsPage = () => {

  return (
    <MainCard title="Patient Other Information">

<Grid container spacing={3}>
       <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="beravement">Safety Issues</InputLabel>
            <TextField
      id="outlined-multiline-flexible"
      label="Safety Issues"
      multiline
      maxRows={5}
      variant="outlined"
    />

          </Stack>
        </Grid>
       <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="beravement">About Me</InputLabel>
            <TextField
      id="outlined-multiline-flexible"
      label="About Me"
      multiline
      maxRows={5}
      variant="outlined"
    />

          </Stack>
        </Grid>
       <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="beravement">Alert</InputLabel>
            <TextField
      id="outlined-multiline-flexible"
      label="Alert"
      multiline
      maxRows={5}
      variant="outlined"
    />

          </Stack>
        </Grid>
    </Grid>
     <Grid sx={{mt:2}}>
     <Button variant="contained" component={Link} href="#">
               Save 
             </Button>
     </Grid>
</MainCard>
  );
};

export default AlertTagsPage;
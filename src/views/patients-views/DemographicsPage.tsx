import Grid from '@mui/material/Grid';
// ASSETS
import { Button, InputLabel, Link, MenuItem, Select, Stack } from '@mui/material';
import MainCard from 'components/MainCard';

// ==============================|| ACCOUNT PROFILE - BASIC ||============================== //

const Demographics = () => {

  return (
    <MainCard title="Demographics & Choices">
       <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Consents">language</InputLabel>
            <Select fullWidth id="Consents" value="">
              <MenuItem value="1">Yes</MenuItem>
            </Select>
          </Stack>
        </Grid>
      <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Consents">Funeral Home</InputLabel>
            <Select fullWidth id="Consents" value="1" placeholder='Type to search'>
              <MenuItem value="1">Type to search</MenuItem>
            </Select>
          </Stack>
        </Grid>
      <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Consents">Marital Status</InputLabel>
            <Select fullWidth id="Consents" value="1" placeholder='Type to search'>
              <MenuItem value="1">Type to search</MenuItem>
            </Select>
          </Stack>
        </Grid>
      <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Consents">Transportation</InputLabel>
            <Select fullWidth id="Consents" value="1" placeholder='Type to search'>
              <MenuItem value="1">Type to search</MenuItem>
            </Select>
          </Stack>
        </Grid>
      <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Consents">Veteran Status</InputLabel>
            <Select fullWidth id="Consents" value="1" placeholder='Type to search'>
              <MenuItem value="1">Type to search</MenuItem>
            </Select>
          </Stack>
        </Grid>
      <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Consents">Community Group</InputLabel>
            <Select fullWidth id="Consents" value="1" placeholder='Type to search'>
              <MenuItem value="1">Type to search</MenuItem>
            </Select>
          </Stack>
        </Grid> 
      <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Consents">Veteran Branch</InputLabel>
            <Select fullWidth id="Consents">
              <MenuItem value="Yes">Yes</MenuItem>
            </Select>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Consents">Opt out of Pasthumous Survey (CAHPS)</InputLabel>
            <Select fullWidth id="Consents" value="1" placeholder="Opt out of Pasthumous Survey">
              <MenuItem value="1">Opt out of Pasthumous Survey</MenuItem>
            </Select>
          </Stack>
        </Grid>
       </Grid>
       <Grid sx={{mt:3}}>
       <Button variant="contained" component={Link} href="#">
              Save
            </Button> </Grid>
    </MainCard>
  );
};

export default Demographics;
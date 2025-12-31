import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
// ASSETS
import { Button, InputLabel, Stack, TextField } from '@mui/material';
import MainCard from 'components/MainCard';

// ==============================|| ACCOUNT PROFILE - BASIC ||============================== //

const IdgTeam = () => {

  return (
    <MainCard title="Patient Team Information">
    <Grid container spacing={3}>
    <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="idg_group">IDG Group</InputLabel>
            <TextField  id="idg_group" placeholder="IDG GROUP" defaultValue="IDG 1" autoFocus disabled/>
          </Stack>
        </Grid>
    <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="hospice">Hospice Aide (HA)</InputLabel>
            <TextField  id="hospice" placeholder="Hospice" defaultValue="Frabrice Adjam" autoFocus disabled/>
          </Stack>
        </Grid>
    <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Registerd">Registerd Nurse (RN)</InputLabel>
            <TextField  id="Registerd" placeholder="Registerd Nurse (RN)" defaultValue="Grace Adjam" autoFocus disabled/>
          </Stack>
        </Grid>
    <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="therapist">Therapist (THP)</InputLabel>
            <TextField  id="therapist" placeholder="Therapist (THP)" defaultValue="Assign RolesTherapist (THP)" autoFocus disabled/>
          </Stack>
        </Grid>
    <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="hospice_physician">Hospice Physician (HP)</InputLabel>
            <TextField  id="hospice_hysician" placeholder="Hospice Physician" defaultValue="Meg 1" autoFocus disabled/>
          </Stack>
        </Grid>
    <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Licensed">Licensed Practical Nurse (LPN)</InputLabel>
            <TextField  id="Licensed" placeholder="Licensed Practical Nurse" defaultValue="Assign Roles" autoFocus disabled/>
          </Stack>
        </Grid>
    <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Chaplain">Chaplain (CP)</InputLabel>
            <TextField  id="Chaplain" placeholder="ChaplainP" defaultValue="Grace Adjam" autoFocus disabled/>
          </Stack>
        </Grid>
    <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="beravement">Beravement Care (BER)</InputLabel>
            <TextField  id="beravement" placeholder="Beravement" defaultValue="Assign Roles" autoFocus disabled/>
          </Stack>
        </Grid>
    <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="practitioner">Nurse Practitioner (NP)</InputLabel>
            <TextField  id="practitioner" placeholder="Practitioner" defaultValue="Assign Roles" autoFocus disabled/>
          </Stack>
        </Grid>
    <Grid item xs={12} sm={6}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="beravement">Volunteer (VOL)</InputLabel>
            <TextField  id="beravement" placeholder="Beravement" defaultValue="Assign Roles" autoFocus disabled/>
          </Stack>
        </Grid>
    </Grid>
    <Grid sx={{mt:2}}>
    <Button variant="contained" component={Link} href="#">
              Save Patient Team Information
            </Button>
    </Grid>
  </MainCard>
  );
};

export default IdgTeam;
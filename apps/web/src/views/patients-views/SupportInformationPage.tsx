import { Grid, Stack, InputLabel, TextField, MenuItem, Select } from '@mui/material';
import MainCard from 'components/MainCard';
// ==============================|| ACCOUNT PROFILE - BASIC ||============================== //

const SupportInformation = () => {

  return (
<MainCard title="Related Person Information">
    <Grid container spacing={3}>  
        <Grid item xs={12} sm={6} md={4}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Firsname">* First Name</InputLabel>
            <TextField fullWidth defaultValue="Doung" id="Firsname" placeholder="Firsname" autoFocus />
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="lastName"> * Last Name</InputLabel>
            <TextField fullWidth defaultValue="Grace" id="lastName" placeholder="Last Name" />
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={1}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="mi">MI</InputLabel>
            <TextField fullWidth defaultValue="E" id="mi" placeholder="MI" autoFocus />
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="suffix"> * Suffix</InputLabel>
            <TextField fullWidth defaultValue="" id="suffix" placeholder="Suffix" />
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="email">Email</InputLabel>
            <TextField fullWidth defaultValue="" id="email" placeholder="Email" autoFocus />
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Phone">Home Phone</InputLabel>
            <TextField fullWidth defaultValue="123-456-7890" id="Phone" placeholder="123-456-7890" />
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="mobile_phone">Mobile Phone</InputLabel>
            <TextField fullWidth defaultValue="123-456-7890" id="mobile_phone" placeholder="123-456-7890" />
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Consents">* Relation</InputLabel>
            <Select fullWidth id="Consents" value="1">
              <MenuItem value="1">Relation</MenuItem>
            </Select>
          </Stack>
        </Grid>{' '}
        <Grid item xs={12} sm={6} md={2}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="received">* Contact Order</InputLabel>
            <Select fullWidth id="received" value="1">
              <MenuItem value="1">Contact</MenuItem>
            </Select>
          </Stack>
        </Grid>{' '}
        <Grid item xs={12} sm={6} md={2}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Gender">Gender</InputLabel>
            <Select fullWidth id="Gender" value="1">
              <MenuItem value="1">M</MenuItem>
              <MenuItem value="2">F</MenuItem>
            </Select>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="diagnosis">State</InputLabel>
            <Select fullWidth id="diagnosis" value="1" defaultValue="">
              <MenuItem value="1">State</MenuItem>
            </Select>
          </Stack>
        </Grid>{' '}
        <Grid item xs={12} sm={6} md={4}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="Pharmacy">Opt out of Pasthumous Survey (CAHPS)</InputLabel>
            <Select fullWidth id="Pharmacy" value="1">
              <MenuItem value="1">Opt out of Pasthumous Survey</MenuItem>
            </Select>
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="street_address">Street Address</InputLabel>
            <TextField  id="street_address" placeholder="Street Address" autoFocus />
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="street_address_line2">Street Address Line 2</InputLabel>
            <TextField  id="street_address_line2" placeholder="Street Address Line 2" />
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Stack spacing={1.25}>
            <InputLabel htmlFor="city">City</InputLabel>
            <TextField fullWidth  id="city" placeholder="city" />
          </Stack>
        </Grid>
      </Grid>
    </MainCard>
  );
};

export default SupportInformation;
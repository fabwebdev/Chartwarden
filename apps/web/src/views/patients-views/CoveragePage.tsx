// PROJECT IMPORTS
import MainCard from 'components/MainCard';
import { Typography, Grid, CardContent, Stack, InputLabel, TextField, Divider, Button, FormControlLabel, Checkbox } from '@mui/material';

import { InfoCircle } from 'iconsax-react';

const CoveragePage = () => {

   
  return (
    <Grid container spacing={3}>
    <Grid item xs={12} md={5}>

    <MainCard title="Payor Information">
    <Typography variant="h5" color="dark">
                 * HIS A1400. Payor Information (one or many)
                </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Stack >
            <FormControlLabel value="end" control={<Checkbox />} label="Medicare (traditional fee-for-service)" labelPlacement="end"  />
            <FormControlLabel value="end" control={<Checkbox  />} label="Medicare (managed care/Part C/Medicare Advantage)" labelPlacement="end"  />
            <FormControlLabel value="end" control={<Checkbox  />} label="Medicare (traditional free-for-service)" labelPlacement="end"  />
            <FormControlLabel value="end" control={<Checkbox  />} label="Medicare (managed care)" labelPlacement="end"  />
            <FormControlLabel value="end" control={<Checkbox />} label="Other governement. (TRICARE, VA, etc)" labelPlacement="end"  />
            <FormControlLabel value="end" control={<Checkbox  />} label="Private Insurance/Medigap" labelPlacement="end"  />
            <FormControlLabel value="end" control={<Checkbox  />} label="Private Managed Care" labelPlacement="end"  />
            <FormControlLabel value="end" control={<Checkbox  />} label="Self-pay" labelPlacement="end"  />
            <FormControlLabel value="end" control={<Checkbox />} label="No Payor Source" labelPlacement="end"  />
            <FormControlLabel value="end" control={<Checkbox  />} label="Unknown" labelPlacement="end"  />
            <FormControlLabel value="end" control={<Checkbox  />} label="Other" labelPlacement="end"  />
            </Stack>
          <Grid>
          <Button variant="contained">
              Save
            </Button>
          </Grid>
          </Grid>
          </Grid>
        </MainCard> 
    </Grid>
    <Grid item xs={12} md={7}>
    <MainCard title="Pro-Bono Services" sx={{ mb: 2.5 }}>
    <CardContent>

    <Stack spacing={1.25}>
          <InputLabel htmlFor="payer">Payer : </InputLabel>
          <TextField fullWidth defaultValue="Organization engrace" id="payer" placeholder="payer" autoFocus />
        </Stack>
        </CardContent>
        <Divider />
        <Stack spacing={1.25}  sx={{ mt: 2.5 }}>
        <Typography variant="body2" color="secondary">
        <InfoCircle size={14} /> 0  Comments
                </Typography>
        </Stack>
    </MainCard> 
    <Button variant="contained"> Add New Coverage</Button>
    </Grid>
  </Grid>
  );
};

export default CoveragePage;
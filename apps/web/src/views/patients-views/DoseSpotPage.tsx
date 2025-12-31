import { Grid, Stack, Typography, useMediaQuery } from '@mui/material';
import MainCard from 'components/MainCard';
import { useTheme } from '@mui/material/styles';
import { ThemeMode } from 'types/config';
const DoseSpotPage = () => {

    const theme = useTheme();
    const matchDownSM = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <MainCard
    border={false}
    content={false}
    sx={{padding:3, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'warning.200' : 'warning.lighter', position: 'relative' }}
  >
    
    <Grid container justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 5 }}>
      <Grid item>
        <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
          <Stack spacing={0.75}>
            <Typography variant="h6">In order to use Dose Spot, you need to fix the following issues</Typography>
            <Typography variant="body1" color="secondary">
            Practitioner info : Practitioner does not have a Dose Spot account
            </Typography>
          </Stack>
        </Stack>
      </Grid>
    </Grid>
  </MainCard>
  );
};

export default DoseSpotPage;
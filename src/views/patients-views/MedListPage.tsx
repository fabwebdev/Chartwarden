import { Button, Collapse, Grid, Stack, Typography, useMediaQuery } from '@mui/material';
import MainCard from 'components/MainCard';
import { useTheme } from '@mui/material/styles';
import { ThemeMode } from 'types/config';
import { useMemo, useState } from 'react';
import StickyTable from 'sections/tables/react-table/StickyTable';
const MedListPage = () => {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setOpen(!open);
  };

    const theme = useTheme();
    const matchDownSM = useMediaQuery(theme.breakpoints.down('sm'));
    const columns = useMemo(
      () => [
        {
          Header: 'Drug Name, Strength, Form',
          accessor: 'drug',
          sticky: 'left',
        },
        {
          Header: 'Directions',
          accessor: 'directions',
          sticky: 'left',
        },
        {
          Header: 'Type',
          accessor: 'type',
          sticky: 'left',
        },
        {
          Header: 'Diagnosis',
          accessor: 'diagnosis',
          sticky: 'left',
        },
        {
          Header: 'Start Date',
          accessor: 'start',
          sticky: 'left',
        },
        {
          Header: 'Status ',
          accessor: 'status',
          sticky: 'left',
        },
      ],
      []
    );
  return (
<>
<Grid container spacing={2} alignItems="center" sx={{mb: 2}}>
      <Grid item>
        <Button variant="text" color="inherit" sx={{ border: '1px solid #fafafa', borderRadius: '5px' }}>Sync Medications</Button>
      </Grid>
      <Grid item>
      <Button onClick={handleClick} variant="outlined"  sx={{ border: '1px solid #fafafa', borderRadius: '5px' }}>
        {open ? 'Oxygen Orders' : 'Oxygen Orders'}
      </Button>
      
      </Grid>
      <Grid item>
        <span>Last sync: 03/24/2024 12:30</span>
      </Grid>
    </Grid>
    <Grid>
    <Collapse in={open}>
        <Typography>
        <Grid item xs={12} sx={{ mt: 3 }}> {/* Colonne pour le contenu */}
      <StickyTable columns={columns} data={[]} />
    </Grid>
        </Typography>
      </Collapse>
    </Grid>
<MainCard
    border={false}
    content={false}
    sx={{padding:3, bgcolor: theme.palette.mode === ThemeMode.DARK ? 'success.200' : 'success.lighter', position: 'relative' }}
  >
    
    <Grid container justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 5 }}>
      <Grid item>
        <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
          <Stack spacing={0.75}>
            <Typography variant="h6">Drug/Allergy interactions</Typography>
            <Typography variant="body1" color="secondary">
            No interactions found
            </Typography>
          </Stack>
        </Stack>
      </Grid>
    </Grid>
  </MainCard>
    <Grid item xs={12} sx={{ mt: 3 }}> {/* Colonne pour le contenu */}
      <StickyTable columns={columns} data={[]} />
    </Grid>
</>
  );
};

export default MedListPage;
import { Grid, Stack, InputLabel, FormControlLabel, Checkbox, TextField, InputAdornment, FormGroup } from '@mui/material';
import MainCard from 'components/MainCard';
import { SearchNormal1 } from 'iconsax-react';
import AuthService from 'types/AuthService';

const NeuroBehavioralPage = () => {
  const { permissions, user } = AuthService();
  
  // Check if user has admin role
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';
  
  const hasPermission = (permission: any) => {
    // Admin users have all permissions
    if (isAdmin) {
      return true;
    }
    return permissions.includes(permission);
  };
  return (
    <>
      <MainCard title="Neuro / Behavioral">
          {hasPermission('neurological_assessment_assessment_section_neuro_behavioral_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div
              style={{
                borderLeft: '5px solid #0E83B9',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '630px',
                opacity:hasPermission('neurological_assessment_assessment_section_neuro_behavioral_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('neurological_assessment_assessment_section_neuro_behavioral_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Neurological Assessment</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                  <InputLabel htmlFor="">Oriented to</InputLabel>
                </Grid>
                <Grid item xs={12}>
                  <FormGroup row sx={{ justifyContent: 'space-between' }}>
                    <FormControlLabel control={<Checkbox />} label="N/A" />
                    <FormControlLabel control={<Checkbox />} label="Person" />
                    <FormControlLabel control={<Checkbox />} label="Place" />
                    <FormControlLabel control={<Checkbox />} label="Time" />
                  </FormGroup>
                </Grid>

                <Grid item xs={12}>
                  <Grid item xs={12} md={5}>
                    <Stack spacing={1.25} sx={{ mb: 3 }}>
                      <InputLabel htmlFor="">Hours of Sleep per Day:</InputLabel>
                      <TextField id="outlined-multiline-flexible" variant="outlined" />
                    </Stack>
                  </Grid>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="No Problems identified"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Home Environment/Safety Concerns:"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Suspected Abuse/Neglect:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Community Resources Requested:" />
                  </Stack>
                </Grid>
                <Grid item xs={12} sx={{ ml: 4 }}>
                  <FormGroup row sx={{ justifyContent: 'space-between' }}>
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Meals on Wheels" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Support Groups" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Other:" />
                  </FormGroup>
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Confused" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Dizziness" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Forgetful" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Loss of Sensation" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Headache" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Lethargic" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Neuromuscular Weakness/Loss:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Rigidity" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Seizures" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Spasticity:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Tremors:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Other:" />
                  </Stack>
                  <Grid item xs={12} md={9} sx={{ mt: 3 }}>
                    <Stack spacing={0.25}>
                      <TextField
                        label="Search"
                        variant="outlined"
                        fullWidth
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <SearchNormal1 size="22" color="#000000" />
                            </InputAdornment>
                          )
                        }}
                      />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sx={{ mt: 3 }}>
                    <Stack spacing={0.25}>
                      <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
            </div>
          </Grid>
        </Grid>)}
         {hasPermission('plan_of_care_orders_section_neuro_behavioral_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div style={{ 
              borderLeft: '5px solid #A624E2',
               borderRadius: '5px', 
               boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
               opacity:hasPermission('plan_of_care_orders_section_neuro_behavioral_hope_edit')? 1 :0.9,
               pointerEvents:hasPermission('plan_of_care_orders_section_neuro_behavioral_hope_edit') ? 'auto':'none' 
                }}>
              <div style={{ backgroundColor: '#CC58F09F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Pan of Care Orders</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Alteration in Neurological Status:"
                      sx={{ m: 0, p: 0 }}
                    />
                  </Stack>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Alteration in Behavioral Status:"
                      sx={{ m: 0, p: 0 }}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </div>
          </Grid>
        </Grid>)}
      </MainCard>
    </>
  );
};

export default NeuroBehavioralPage;

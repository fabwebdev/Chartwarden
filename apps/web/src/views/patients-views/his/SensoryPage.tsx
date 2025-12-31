import { Grid, Stack, InputLabel, FormControlLabel, Checkbox, TextField, InputAdornment, Typography, MenuItem, Select } from '@mui/material';
import MainCard from 'components/MainCard';
import { SearchNormal1 } from 'iconsax-react';
import AuthService from 'types/AuthService';

const SensoryPage = () => {
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
      <MainCard title="Sensory">
      {hasPermission('sensory_ssessment_assessment_section_sensory_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div
              style={{
                borderLeft: '5px solid #0E83B9',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '630px',
                opacity:hasPermission('sensory_ssessment_assessment_section_sensory_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('sensory_ssessment_assessment_section_sensory_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Sensory Assessment</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="No Problem Identified"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Abnormal Pupils/Vision:"
                      sx={{ m: 0, p: 0 }}
                    />
                  </Stack>
                </Grid>
                {/* Première ligne */}
                <Grid container item xs={12} spacing={2} sx={{ml:3}}>
                  <Grid item xs={4}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Blind"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Glaucome"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Macular Degenertion" sx={{ m: 0, p: 0 }} />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Wears Corrective Lenses" sx={{ m: 0, p: 0 }} />
                    </Grid>
                  </Grid>
                  <Grid item xs={4}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Blurred vision"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Legally Blind"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Pupils Non Reactive" sx={{ m: 0, p: 0 }} />
                    </Grid>
                  </Grid>
                  <Grid item xs={4}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Catarract"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Low Vision (Partially Blind"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Pupils Sluggish" sx={{ m: 0, p: 0 }} />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Aphasia:"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Hearing-Impaired:"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Ear Drainage:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Pain in Ear(s)" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Ringing in Ear(s)" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Slurred Speech" />
                  </Stack>
                </Grid>

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
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Stack spacing={0.25}>
                      <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                    </Stack>
                  </Grid>
              </Grid>
            </div>
          </Grid>
        </Grid> )}
         {hasPermission('plan_of_care_orders_section_sensory_hope_views') && (
        <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{ 
                borderLeft: '5px solid #A624E2', 
                borderRadius: '5px', 
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity:hasPermission('plan_of_care_orders_section_sensory_hope_edit')? 1 :0.9,
                    pointerEvents:hasPermission('plan_of_care_orders_section_sensory_hope_edit') ? 'auto':'none' 
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
                        label="Alteration in Sensory Status:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Stack>
                    <Grid item xs={12} sx={{ ml: 4, mb: 1 }}>
                      <Typography variant="h5" color="dark">
                       Select Problem Statement
                      </Typography>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Hearing Loss:"
                        sx={{ m: 0, p: 0 }}
                      />
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Vision Loss:"
                        sx={{ m: 0, p: 0 }}
                      />
                      <Grid item xs={12}>
                        <Stack spacing={0.25} sx={{ ml: 4 }}>
                          <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                        </Stack>
                      </Grid>
                      <Grid item xs={12} sx={{ ml: 4, mb: 1 }}>
                      <Typography variant="h5" color="dark">
                      Goals
                    </Typography>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="participate in ADLS and Activities:" sx={{ m: 0, p: 0 }} />
                      <Grid item xs={12}>
                      <Stack spacing={0.25} sx={{ml:4}}>
                    <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                    <Grid item xs={12} sm={6} md={2}>
                  <Stack spacing={1.25}>
                    <InputLabel htmlFor="">Goal Length</InputLabel>
                    <Select fullWidth id="scale" value="1" placeholder="Select Marital Status">
                      <MenuItem value="1">15 Days</MenuItem>
                    </Select>
                  </Stack>
                </Grid>
                    </Stack>
                      </Grid>
                     <Grid>
                     <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Other"
                        sx={{ m: 0, p: 0 }}
                      />
                     </Grid>
                      </Grid>
                      <Grid item xs={12} sx={{ ml: 4, mb: 1 }}>
                      <Typography variant="h5" color="dark">
                      Interventions
                    </Typography>
                    <Grid> 
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Perform: Presence and Active Listening:" sx={{ m: 0, p: 0 }} />
                    </Grid>
                    <Grid> 
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Perform: Presence and Active Listening:" sx={{ m: 0, p: 0 }} />
                    </Grid>
                    <Grid> 
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Perform: Presence and Active Listening:" sx={{ m: 0, p: 0 }} />
                    </Grid>
                    <Grid> 
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Perform: Presence and Active Listening:" sx={{ m: 0, p: 0 }} />
                    </Grid>
                      <Grid item xs={12}>
                      <Stack spacing={0.25} sx={{ml:4}}>
                    <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                    <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <InputLabel htmlFor="">Assigned To:</InputLabel>
                    <TextField id="outlined-multiline-flexible" multiline minRows={3} variant="outlined" />
                  </Stack>
                </Grid>
                    </Stack>
                      </Grid>
                  
                     <Grid>
                     <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Other:"
                        sx={{ m: 0, p: 0 }}
                      />
                     </Grid>
                      
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </div>
            </Grid>
          </Grid>)}
      </MainCard>
    </>
  );
};

export default SensoryPage;

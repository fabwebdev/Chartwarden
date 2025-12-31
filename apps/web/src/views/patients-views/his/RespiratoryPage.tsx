import { Grid, Stack, FormControlLabel, Checkbox, TextField, InputAdornment, FormGroup, Radio, Typography, FormControl, RadioGroup, OutlinedInput } from '@mui/material';
import MainCard from 'components/MainCard';
import { SearchNormal1 } from 'iconsax-react';
import AuthService from 'types/AuthService';

const RespiratoryPage = () => {
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
      <MainCard title="Respiratory">
      {hasPermission('respiratory_assessment_section_respiratory_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div
              style={{
                borderLeft: '5px solid #0E83B9',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '630px',
                opacity:hasPermission('respiratory_assessment_section_respiratory_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('respiratory_assessment_section_respiratory_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Respiratory Assessment</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
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
                      label="Abnormal Breath Sounds:"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Accessory Muscles Used:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Clubbing" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Abnormal Respirations:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Cough:" />
                  </Stack>
                </Grid>
                <Grid item xs={12} sx={{ ml: 4 }} md={6}>
                  <FormGroup row sx={{ justifyContent: 'space-between' }}>
                  <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Non - Productive" />
                  <FormControlLabel value="2" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Productive" />
                  </FormGroup>
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Nebulizer" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Oxygen Use, Intermittent:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Oxygen Use, Continuous:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Tracheostomy:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Advanced Aiway Support:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Drainage Tubes:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Suction:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Other:" />
                  </Stack>

                  <Typography variant="h5" color="dark" sx={{mt:2}}>
                   Oxygen Safety Risks Noted:
                  </Typography>
                  <Stack spacing={1.25} sx={{ml:2}}>
                    <FormControl component="fieldset">
                      <RadioGroup aria-label="gender" name="gender1" value="2">
                        <Grid container>
                          <Grid item xs={12}>
                            <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="No" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="2" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Yes" />
                          </Grid>
                        </Grid>
                      </RadioGroup>
                    </FormControl>{' '}
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
        </Grid>  )}
         {hasPermission('screening_for_shortness_of_breath_section_respiratory_hope_views') && (
        <Grid item xs={12} sx={{ p: 1 }}>
            <div
              style={{
                borderLeft: '5px solid #0AA369',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '630px',
                opacity:hasPermission('screening_for_shortness_of_breath_section_respiratory_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('screening_for_shortness_of_breath_section_respiratory_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Screening for Shortness of Breath</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 3 }}>
                <Grid item xs={12}>
                  <Typography variant="h5" color="dark">
                   Was the patient screened for shorness of breath:
                  </Typography>
                  <Stack spacing={1.25}>
                    <FormControl component="fieldset">
                      <RadioGroup aria-label="gender" name="gender1" value="2">
                        <Grid container>
                          <Grid item xs={12}>
                            <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="No" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="2" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Yes" />
                          </Grid>
                        </Grid>
                      </RadioGroup>
                    </FormControl>{' '}
                  </Stack>
                  <Grid item xs={12} sx={{ ml: 3 }}>
                    <Typography variant="h5" color="dark">
                      Date to First Screening for shorness of breath:
                    </Typography>
                    <Grid item xs={12} >
                      <Stack spacing={1.25}>
                        <OutlinedInput id="" type="date" />
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Typography variant="h5" color="dark">
                        Did the Screening indicate the patient had shorness of breath:?
                      </Typography>
                      <Stack spacing={1.25}>
                        <FormControl component="fieldset">
                          <RadioGroup aria-label="gender" name="gender1" value="2">
                            <Grid container>
                              <Grid item xs={12}>
                                <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="No" />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControlLabel value="2" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Yes" />
                              </Grid>
                            </Grid>
                          </RadioGroup>
                        </FormControl>{' '}
                      </Stack>
                      <Grid item xs={12}  sx={{ ml: 3, mt: 1 }}>
                        <Grid item xs={12}>
                        <Typography variant="h5" color="dark">
                          Was treatment for shortness of breath initiated?
                        </Typography>
                  <Stack spacing={1.25}>
                    <FormControl component="fieldset">
                      <RadioGroup aria-label="gender" name="gender1" value="2">
                        <Grid container>
                          <Grid item xs={12}>
                            <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="No" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="2" control={<Radio sx={{ p: 0, pr: 1 }} />} label="No" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="3" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Yes" />
                          </Grid>
                        </Grid>
                      </RadioGroup>
                    </FormControl>{' '}
                  </Stack>
                  <Grid item xs={12} sx={{ ml: 3 }}>
                    <Typography variant="h5" color="dark">
                      Date treatment  for shorness of breath was Initiated:
                    </Typography>
                    <Grid item xs={12} >
                      <Stack spacing={1.25}>
                        <OutlinedInput id="" type="date" />
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sx={{ mt: 1 }}>
                      <Typography variant="h5" color="dark">
                        Type(s) of Treatment for Shortness of Breath Initiated:
                      </Typography>
                      <Stack spacing={1.25}>
                        <FormControl component="fieldset">
                            <Grid container>
                              <Grid item xs={12}>
                                <FormControlLabel value="1" control={<Checkbox sx={{ p: 0, pr: 1 }} />} label="Opiods" />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControlLabel value="2" control={<Checkbox sx={{ p: 0, pr: 1 }} />} label="Other Medications" />
                              </Grid>
                            </Grid>
                        </FormControl>{' '}
                      </Stack>
                      <Grid item xs={12} sx={{ml:3}}>
                      <Stack spacing={1.25}>
                        <OutlinedInput id="" type="text" placeholder='PIN'/>
                      </Stack>
                    </Grid>
                    <Stack spacing={1.25}>
                        <FormControl component="fieldset">
                            <Grid container>
                              <Grid item xs={12}>
                                <FormControlLabel value="1" control={<Checkbox sx={{ p: 0, pr: 1 }} />} label="Oxygen" />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControlLabel value="2" control={<Checkbox sx={{ p: 0, pr: 1 }} />} label="Non-Medication" />
                              </Grid>
                            </Grid>
                        </FormControl>{' '}
                      </Stack>
                    </Grid>
                  </Grid>
                </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

              <Grid item xs={12} sx={{  mt: 1 }}>
                        <Typography variant="h5" color="dark">
                          Was treatment for shortness of breath initiated?
                        </Typography>
                        <Grid container item xs={12} spacing={2}>

                        <Grid item xs={6}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="With Walking > 20 Feet"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="With Minimal Exertion (i.e Eating, Talking, Performing ADLS)"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Patient with Incresed Shortness of Breath" sx={{ m: 0, p: 0 }} />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Shortness of Breath Limits Patient's Functionning and Quality of Life" sx={{ m: 0, p: 0 }} />
                    </Grid>
                  </Grid>
                  <Grid item xs={6}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="With Moderate Exertion (i.e. While Dressing Using Commode/Bedpan Walking < 20 Feet"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="At Rest (During the Day or Night)"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Respiratory Distress Noted"  sx={{ m: 0, p: 0 }} />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Orthopnea:"  sx={{ m: 0, p: 0 }} />
                    </Grid>
                  </Grid>
                        </Grid>
                      </Grid>
              </Grid>
            </div>
          </Grid>  )}

          {hasPermission('plan_of_care_orders_section_respiratory_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div style={{ 
              borderLeft: '5px solid #A624E2', 
              borderRadius: '5px', 
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              opacity:hasPermission('plan_of_care_orders_section_respiratory_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('plan_of_care_orders_section_respiratory_hope_edit') ? 'auto':'none' 
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
                      label="Altration in Respiratory Status:"
                      sx={{ m: 0, p: 0 }}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </div>
          </Grid>
        </Grid>  )}
      </MainCard>
    </>
  );
};

export default RespiratoryPage;

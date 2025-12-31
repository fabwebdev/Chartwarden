import {
  Grid,
  Stack,
  InputLabel,
  FormControlLabel,
  Checkbox,
  TextField,
  InputAdornment,
  FormGroup,
  Radio,
  Typography,
  FormControl,
  RadioGroup,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import MainCard from 'components/MainCard';
import { SearchNormal1 } from 'iconsax-react';
import AuthService from 'types/AuthService';

const SummaryPage = () => {
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
      <MainCard title="Genitourinary">
      {hasPermission('physician_orders_section_Genitourinary_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div style={{ 
              borderLeft: '5px solid #A624E2', 
              borderRadius: '5px', 
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              opacity:hasPermission('physician_orders_section_Genitourinary_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('physician_orders_section_Genitourinary_hope_edit') ? 'auto':'none'
               }}>
              <div style={{ backgroundColor: '#CC58F09F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Physician Orders</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="SN Evaluation Performed Need for Hospice Services Indicated:"
                      sx={{ m: 0, p: 0 }}
                    />
                  </Stack>
                  <Grid item xs={12} sx={{ mb: 1 }}>
                    <Grid item xs={12}>
                      <Stack spacing={0.25} sx={{ ml: 4 }}>
                        <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                        <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Select to Add additional Odrders or Agency Templates:"
                          sx={{ m: 0, p: 0 }}
                        />
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sx={{ mb: 1, mt: 1 }}>
                      <Grid>
                        <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Physician Contact:"
                          sx={{ m: 0, p: 0 }}
                        />
                      </Grid>
                      <Grid>
                        <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Verbal Certification Received:"
                          sx={{ m: 0, p: 0 }}
                        />
                      </Grid>
                      <Grid>
                        <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Pronouncement of Death:"
                          sx={{ m: 0, p: 0 }}
                        />
                      </Grid>
                      <Grid item xs={12} sx={{ mb: 1 }}>
                        <Typography variant="h3" color="dark">
                          Diet
                        </Typography>
                        <Typography variant="body2" color="dark">
                          Entre diet consistency, therapeutic diet order and fluid orders if thisckened or resticted.
                        </Typography>
                        <Grid item xs={12}>
                          <Stack spacing={0.25}>
                            <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                          </Stack>
                        </Grid>
                        <Grid sx={{ mt: 1 }}>
                          <Typography variant="h3" color="dark">
                            Activity
                          </Typography>
                        </Grid>
                        <Grid sx={{ mt: 1, ml: 2 }}>
                          <Grid container item xs={12} spacing={2}>
                            <Grid item xs={4}>
                              <Stack spacing={1.25}>
                                <FormControl component="fieldset">
                                  <RadioGroup aria-label="gender" name="gender1" value="2">
                                    <Grid container>
                                      <Grid item xs={12}>
                                        <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Bed Rest" />
                                      </Grid>
                                      <Grid item xs={12}>
                                        <FormControlLabel value="2" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Independent" />
                                      </Grid>
                                    </Grid>
                                  </RadioGroup>
                                </FormControl>{' '}
                              </Stack>
                            </Grid>
                            <Grid item xs={4}>
                              <Stack spacing={1.25}>
                                <FormControl component="fieldset">
                                  <RadioGroup aria-label="gender" name="gender1" value="2">
                                    <Grid container>
                                      <Grid item xs={12}>
                                        <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Up with Assistance" />
                                      </Grid>
                                      <Grid item xs={12}>
                                        <FormControlLabel value="2" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Other:" />
                                      </Grid>
                                    </Grid>
                                  </RadioGroup>
                                </FormControl>{' '}
                              </Stack>
                            </Grid>
                            <Grid item xs={4}>
                              <Stack spacing={1.25}>
                                <FormControl component="fieldset">
                                  <RadioGroup aria-label="gender" name="gender1" value="2">
                                    <Grid container>
                                      <Grid item xs={12}>
                                        <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Up as Tolerated" />
                                      </Grid>
                                    </Grid>
                                  </RadioGroup>
                                </FormControl>{' '}
                              </Stack>
                            </Grid>
                          </Grid>
                        </Grid>
                        <Grid sx={{ mt: 3 }}>
                          <Typography variant="h3" color="dark">
                            Level of Care
                          </Typography>
                          <Typography variant="h5" color="dark">
                            Select Level of Care
                          </Typography>
                          <Stack spacing={1.25} sx={{ ml: 1, my: 2 }}>
                            <FormControl component="fieldset">
                              <RadioGroup aria-label="gender" name="gender1" value="2">
                                <Grid container>
                                  <Grid item xs={12}>
                                    <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Routine Home Care" />
                                    <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Respite Care" />
                                    <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="General Inpatient Care" />
                                    <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Continuous Care" />
                                  </Grid>
                                </Grid>
                              </RadioGroup>
                            </FormControl>{' '}
                          </Stack>
                        </Grid>
                        <Grid sx={{ mt: 3 }}>
                          <Typography variant="h3" color="dark">
                            Higher Level of Care
                          </Typography>
                          <Typography variant="h5" color="dark">
                            Need for Higher Level of Care
                          </Typography>
                          <Stack spacing={1.25} sx={{ ml: 1, my: 2 }}>
                            <FormControl component="fieldset">
                              <RadioGroup aria-label="gender" name="gender1" value="2">
                                <Grid container>
                                  <Grid item xs={12}>
                                    <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Yes" />
                                  </Grid>
                                  <Grid item xs={12}>
                                    <FormControlLabel value="2" control={<Radio sx={{ p: 0, pr: 1 }} />} label="No" />
                                  </Grid>
                                </Grid>
                              </RadioGroup>
                            </FormControl>{' '}
                          </Stack>
                        </Grid>
                        <Grid>
                          <Typography variant="h5" color="dark">
                            Documentation
                          </Typography>
                          <Grid item xs={12} sx={{ mt: 1 }}>
                            <Stack spacing={0.25}>
                              <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                            </Stack>
                          </Grid>
                        </Grid>
                        <Grid item sx={{ mt: 2 }}>
                          <FormControlLabel
                            value="right"
                            control={<Checkbox sx={{ m: 0, p: 0 }} />}
                            label="Physician Contacted for Orders:"
                            sx={{ m: 0, p: 0 }}
                          />
                        </Grid>
                        <Grid>
                          <FormControlLabel
                            value="right"
                            control={<Checkbox sx={{ m: 0, p: 0 }} />}
                            label="Coordination of Care with IDG"
                            sx={{ m: 0, p: 0 }}
                          />
                        </Grid>
                        <Grid>
                          <FormControlLabel
                            value="right"
                            control={<Checkbox sx={{ m: 0, p: 0 }} />}
                            label="Coordination with Facility Nurses Regarding Symptom Management and Documentation"
                            sx={{ m: 0, p: 0 }}
                          />
                        </Grid>
                        <Button variant="contained" sx={{ my: 2 }}>
                          Frequency
                        </Button>
                      </Grid>
                    </Grid>
                    <Grid>
                      <Typography variant="h5" color="dark">
                        Discipline Frequencies
                      </Typography>
                      <Typography variant="body2" color="dark">
                        Accepted frequency format example: 1m1, 2w2 2wk3, 1ow2, 1d4, 3pm. Enter a ";" between each frequency for a given
                        dicipline , e.g 3w1; 2w10; 1w1, Frequency ranges should not be used for Hospice Aide , Hoùemaker, or Volunteer, PRN
                        Frequencies should not be used for Hospice Aide or Homemaker.
                      </Typography>
                      <Grid item xs={12} sx={{ mt: 1 }}>
                        <Stack spacing={0.25}>
                          <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                        </Stack>
                      </Grid>
                      <Button variant="contained" sx={{ my: 2 }}>
                        Add Supply
                      </Button>
                      <Button variant="contained" sx={{ my: 2, mx: 3 }}>
                        Add DME
                      </Button>
                      <Button variant="contained" sx={{ my: 2 }}>
                        Add HA Plan of Care
                      </Button>
                      <Button variant="contained" sx={{ my: 2, mx: 3 }}>
                        Add Homemaker Plan of Care
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </div>
          </Grid>
        </Grid>  )}
        {hasPermission('infection_surveillance_section_genitourinary_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div style={{ 
              borderLeft: '5px solid #248CE2', 
              borderRadius: '5px', 
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              opacity:hasPermission('infection_surveillance_section_genitourinary_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('infection_surveillance_section_genitourinary_hope_edit') ? 'auto':'none'
               }}>
              <div style={{ backgroundColor: '#589FF09F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Infection Surveillance</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h5" color="dark">
                    COVID-19 What You Need to Know
                  </Typography>
                  <Stack spacing={1.25} sx={{ ml: 1, my: 4 }}>
                    <Typography variant="h6" color="dark">
                      Infection Risk Factors
                    </Typography>
                    <FormControl component="fieldset">
                      <RadioGroup aria-label="gender" name="gender1" value="2">
                        <Grid container>
                          <Grid item xs={12}>
                            <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Yes" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="2" control={<Radio sx={{ p: 0, pr: 1 }} />} label="No" />
                          </Grid>
                        </Grid>
                      </RadioGroup>
                    </FormControl>{' '}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h5" color="dark">
                    Symptoms of COVID-19
                  </Typography>
                  <Stack spacing={1.25} sx={{ ml: 1, my: 4 }}>
                    <Typography variant="h6" color="dark">
                      Infection Control
                    </Typography>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Standard Precautions Odserved"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Shaps Disposal Per Biohazard P & P"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Soiled Waste Disposed Per BiohaZard P & P"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Patient/Caregiver Demonstrated Deficits Regarding Infection Control:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="New Infection Suspected"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="New Infection Diagnosed"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained">Add Supply</Button>
                  <Button variant="contained" sx={{ mx: 3 }}>
                    Add DME
                  </Button>
                </Grid>
              </Grid>
            </div>
          </Grid>
        </Grid>  )}
        <Grid container spacing={3}>
        {hasPermission('coordination_of_care_section_genitourinary_hope_views') && (
          <Grid item xs={12} sm={12} md={6}>
            <div
              style={{
                borderLeft: '5px solid #189AAC',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '630px',
                opacity:hasPermission('coordination_of_care_section_genitourinary_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('coordination_of_care_section_genitourinary_hope_edit') ? 'auto':'none'
              }}
            >
              <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Coordination of Care</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="h5" color="dark">
                    Coordinated Care With
                  </Typography>
                </Grid>
                {/* Première ligne */}
                <Grid container item xs={12} spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Skilled Nurse"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Spiritual counselor"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Volunteer Coordinator"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Facility Staff:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Attending Physician"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Patient" sx={{ m: 0, p: 0 }} />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Legal Representative:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Pharmacy" sx={{ m: 0, p: 0 }} />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Other!" sx={{ m: 0, p: 0 }} />
                    </Grid>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Social worker"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Aide/Homemaker Counselor"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Bereavement Counselor"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Clinical Manager"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Hospice Physicician"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Caregiver:" sx={{ m: 0, p: 0 }} />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Vendor:" sx={{ m: 0, p: 0 }} />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="DME Company:" sx={{ m: 0, p: 0 }} />
                    </Grid>
                  </Grid>
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
          </Grid>  )}
          {hasPermission('first_visit_interventions_section_genitourinary_hope_views') && (
          <Grid item xs={12} sm={12} md={6}>
            <div
              style={{
                borderLeft: '5px solid #189AAC',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '630px',
                opacity:hasPermission('first_visit_interventions_section_genitourinary_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('first_visit_interventions_section_genitourinary_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>First Visit Interventions</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="h5" color="dark">
                    Reviewed and/or Instructed on the Following Information
                  </Typography>
                  <Stack spacing={1.25}>
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Medication Review:" />
                  </Stack>
                </Grid>
                <Grid item xs={12} sx={{ ml: 4 }}>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ p: 0 }} />}
                      label="Performed Compete Medication Review and Assessed Drugs Interatcions"
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ p: 0 }} />}
                      label="Performed Medication Reconciliation Due To Noted Discrepancies"
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ p: 0 }} />}
                      label="Instructed Patient/Caregiver on Medication Administration and Ensured Patient/Caregiver is Safe with Medication Administration Until Next Visit"
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ p: 0 }} />}
                      label="Instructed Patient/caregiver on work Place Drug Policy"
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ p: 0 }} />}
                      label="Instructed Patient/caregiver on Medications Covered via Hospice Benefit"
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ p: 0 }} />}
                      label="Instructed Patient/caregiver on Medication Safety and Disposal Policy"
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ p: 0 }} />}
                      label="Select to Add Additional Interventions or Agency Templates:"
                    />
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Legal Requirements:" />
                  </Stack>
                  <Grid item xs={12} sx={{ ml: 4, my: 2 }}>
                    <Stack spacing={1.25} sx={{ my: 2 }}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="Engaged Patient/Caregiver in Discussion"
                      />
                    </Stack>
                    <Grid item xs={12} sx={{ ml: 4 }}>
                      <Stack spacing={0.25}>
                        <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                      </Stack>
                    </Grid>
                    <Stack spacing={1.25} sx={{ my: 2 }}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="Select to Add Additional Interventions or Agency Templates:"
                      />
                    </Stack>
                  </Grid>
                  <Stack spacing={1.25} sx={{ my: 2 }}>
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Symptom Management:" />
                  </Stack>
                  <Grid item xs={12} sx={{ ml: 4 }}>
                    <Stack spacing={1.25}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="Instructed Patient /Caregiver on how to Manage Sign/ Symptoms and when to Call Hospice Agency for Assistance"
                      />
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="Established patient Care Plan and Goals with Patient/Caregiver Involvement and Approval"
                      />
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="Instructed to Call Hospice Agency 24 Hours, 7days/Week to Speak with a Skilled Nurse for all Questions Concerns or issues"
                      />
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="Select to Add Additional Interventions or Agency Templates:"
                      />
                    </Stack>
                  </Grid>
                  <Stack spacing={1.25}>
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Safety" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Emergency Preparedness:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Disciplines/Scheduling:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Face-to-Face Visit Completed:" />
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h5" color="dark">
                          Date Completed
                        </Typography>
                        <Stack spacing={0.25}>
                          <TextField id="outlined-multiline-flexible" variant="outlined" type="date" />
                        </Stack>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h5" color="dark">
                          Completed By
                        </Typography>
                        <Stack spacing={0.25}>
                          <TextField id="outlined-multiline-flexible" variant="outlined" />
                        </Stack>
                      </Grid>
                    </Grid>
                  </Stack>
                  <Grid item xs={12} sx={{ ml: 4 }}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ p: 0 }} />}
                      label="Hospice Coverage and Financial Responsibility:"
                    />
                    <Stack spacing={1.25}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="Reviewed Right to Request Patient Notification of Hospice Non-Coverd Items, Services, and Drugs Addendum"
                      />
                    </Stack>
                    <Grid item xs={12} sx={{ ml: 4 }}>
                      <Stack spacing={0.25}>
                        <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                      </Stack>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </div>
          </Grid>  )}
        </Grid>
              {hasPermission('plan_of_care_orders_section_genitourinary_hope_views') && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{ 
                borderLeft: '5px solid #A624E2', 
                borderRadius: '5px', 
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity:hasPermission('plan_of_care_orders_section_genitourinary_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('plan_of_care_orders_section_genitourinary_hope_edit') ? 'auto':'none'
               }}>
                <div style={{ backgroundColor: '#CC58F09F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Pan of Care Orders</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 1 }}>
                  <Grid item xs={12} md={6}>
                <Grid item xs={12}>
                <Typography variant="h5" color="dark">
                   Etablished Plan of Care/Goals in Collaboration with
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormGroup row sx={{ justifyContent: 'space-between' }}>
                    <FormControlLabel control={<Checkbox />} label="Patient" />
                    <FormControlLabel control={<Checkbox />} label="Caregiver" />
                    <FormControlLabel control={<Checkbox />} label="Facility Staff:" />
                  </FormGroup>
                </Grid>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                <Grid item xs={12}>
                <Typography variant="h5" color="dark">
                  Response to Plan of Care
                  </Typography>
                </Grid>
                    <Stack spacing={1.25}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Agrees with Estabilished Plan of Care/Goals:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Stack>
                    <Grid item xs={12} sx={{ ml: 3 }}>
                  <FormGroup row sx={{ justifyContent: 'space-between' }}>
                    <FormControlLabel control={<Checkbox />} label="Patient" />
                    <FormControlLabel control={<Checkbox />} label="Caregiver" />
                    <FormControlLabel control={<Checkbox />} label="Facility Staff:" />
                  </FormGroup>
                </Grid>
                  </Grid>
                </Grid> <Grid item xs={12}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Diasgrees with One or More items in the plan of Care:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Agrees With the Plan of Care with Requested Revisions:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Verbalized Understanding of Education Provided"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Requires Reinforcement of Education:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                  </Grid>
                  </Grid>
                  <Grid item xs={12} md={6}>
                <Grid item xs={12}>
                <Typography variant="h5" color="dark">
                 Education and Training on ResponsibilittiesRegarding Plan of Care Provided to
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormGroup row sx={{ justifyContent: 'space-between' }}>
                    <FormControlLabel control={<Checkbox />} label="Patient" />
                    <FormControlLabel control={<Checkbox />} label="Caregiver" />
                    <FormControlLabel control={<Checkbox />} label="Facility Staff:" />
                  </FormGroup>
                </Grid>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                <Grid item xs={12}>
                <Typography variant="h5" color="dark">
                 Participation in Plan of Care
                  </Typography>
                </Grid>
                    <Grid item xs={12}>
                  <FormGroup>
                    <FormControlLabel control={<Checkbox />} label="Patient" />
                    <FormControlLabel control={<Checkbox />} label="Caregiver" />
                    <FormControlLabel control={<Checkbox />} label="Facility Staff:" />
                  </FormGroup>
                </Grid>
                  </Grid>
                </Grid>
                  </Grid>
                  <Grid container item xs={12} spacing={2}>
                  <Grid item xs={12}>
                <Typography variant="h5" color="dark">
                 Patient Strengths
                  </Typography>
                </Grid>
                  <Grid item xs={4}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="N/A"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Absence of Multiple Comorbidities"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="College Graduate" sx={{ m: 0, p: 0 }} />
                    </Grid>
                  </Grid>
                  <Grid item xs={4}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Motivated Learner"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Enhanced Social Economic Status"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Other:" sx={{ m: 0, p: 0 }} />
                    </Grid>
                  </Grid>
                  <Grid item xs={4}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Strong Support System"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="High Scool Graduate"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    
                  </Grid>
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
                <Button variant="contained" sx={{ mx: 3, mt:2}}>
                    Authorized Contacts
                  </Button>
                </Grid>
              </div>
            </Grid>
          </Grid>  )}
          <Grid container spacing={3}>
          {hasPermission('admission_narrative_section_genitourinary_hope_views') && (
          <Grid item xs={12}>
            <div style={{ 
              borderLeft: '5px solid #2470E2', 
              borderRadius: '5px', 
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              opacity:hasPermission('admission_narrative_section_genitourinary_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('admission_narrative_section_genitourinary_hope_edit') ? 'auto':'none'
               }}>
              <div style={{ backgroundColor: '#589FF09F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Admission Narrative</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                <Button variant="contained" sx={{mt:2}}>
                   Loard Narrative
                  </Button>
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
                <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Send Note to IDG Summary"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                <Button variant="contained" sx={{mt:2}}>
                  Enter Clinical Evaluation /LCDS
                  </Button>
                </Grid>
              </Grid>
            </div>
          </Grid>  )}
          {hasPermission('plan_of_care_orders_section_genitourinary_hope_views') && (
          <Grid container spacing={3}>
          <Grid item xs={12}>
            <div style={{ 
              borderLeft: '5px solid #A624E2', 
              borderRadius: '5px', 
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              opacity:hasPermission('plan_of_care_orders_section_genitourinary_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('plan_of_care_orders_section_genitourinary_hope_edit') ? 'auto':'none'
               }}>
              <div style={{ backgroundColor: '#CC58F09F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Pan of Care Orders</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                  <Stack spacing={1.25} sx={{ my:2 }}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Admission to Hospice:"
                      sx={{ m: 0, p: 0 }}
                    />
                  </Stack>
                  <Grid item xs={12} sx={{ ml: 4, mb: 1 }}>
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Altertion in comfort:" sx={{ m: 0, p: 0 }} />
                    <Grid item xs={12} sx={{ my:2 }}>
                      <Stack spacing={0.25} sx={{ ml: 4 }}>
                        <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sx={{ ml: 4, mb: 1 }}>
                      <Typography variant="h5" color="dark">
                        Goals
                      </Typography>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Complete Comprehensive Assessment:"
                        sx={{ m: 0, p: 0 }}
                      />
                      <Grid item xs={12} sx={{ my:2 }}>
                        <Stack spacing={0.25} sx={{ ml: 4 }}>
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
                    </Grid>
                    
                    <Grid item xs={12} sx={{ ml: 4, mb: 1 }}>
                      <Typography variant="h5" color="dark">
                        Interventions
                      </Typography>
                      <Grid>
                       <Grid>
                       <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Perform: Call to Schedule:"
                          sx={{ m: 0, p: 0 }}
                        />
                       </Grid>
                       <Grid>                        <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Perform: Complete Comprehensive Assessment:"
                          sx={{ m: 0, p: 0 }}
                        /></Grid>
                       <Grid> <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Perform: SN comprehensive Assessment:"
                          sx={{ m: 0, p: 0 }}
                        /></Grid>
                       <Grid><FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Other:"
                          sx={{ m: 0, p: 0 }}
                        /></Grid>
                       <Grid></Grid>

                       
                        
                      </Grid>
                     

                    </Grid>
                  </Grid>
                  <Grid item xs={12} sx={{ ml: 4, mb: 1 }}>
                      <Grid>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="DME, Supplies, and Medications:" sx={{ m: 0, p: 0 }} />
                      </Grid>
                      <Grid>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="When to Call Hospice:" sx={{ m: 0, p: 0 }} />
                      </Grid>
                      <Grid>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Verbalize Understanding of Ordered Medications:" sx={{ m: 0, p: 0 }} />
                      </Grid>
                      <Grid>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Verbalize Understanding of Discplines:" sx={{ m: 0, p: 0 }} />
                      </Grid>
                      <Grid>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Palliative Vs. Curative Approach:" sx={{ m: 0, p: 0 }} />
                      </Grid>
                      <Grid>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Identify Plan for Advance Directive:" sx={{ m: 0, p: 0 }} />
                      </Grid>
                      <Grid>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Other:" sx={{ m: 0, p: 0 }} />
                      </Grid>
                      </Grid>
                      <Grid>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Need for Change in Level of Care:" sx={{ m: 0, p: 0 }} />
                      </Grid> <Grid>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Need for Facility Coordination:" sx={{ m: 0, p: 0 }} />
                      </Grid> <Grid>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Need fpor Infection Management:" sx={{ m: 0, p: 0 }} />
                      </Grid>
                </Grid>
              </Grid>
            </div>
          </Grid>
          </Grid>  )}
        </Grid>
      </MainCard>
    </>
  );
};

export default SummaryPage;

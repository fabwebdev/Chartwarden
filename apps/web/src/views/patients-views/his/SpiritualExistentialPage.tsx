import {
  Grid,
  Stack,
  InputLabel,
  OutlinedInput,
  Select,
  MenuItem,
  Typography,
  FormControl,
  Radio,
  FormControlLabel,
  RadioGroup,
  Checkbox,
  TextField,
  InputAdornment,
} from '@mui/material';
import MainCard from 'components/MainCard';
import { SearchNormal1 } from 'iconsax-react';
import { useEffect, useState } from 'react';
import http from "../../../hooks/useCookie";
import AuthService from 'types/AuthService';

const SpiritualExistentialPage = ({ id }: { id: string }) => {
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
  const [spiritualPreferenceData, setSpiritualPreferenceData] = useState<any>({
    patient_spiritual: "",
    not_religious: false,
    comments: "",
    patient_id: id
  });
  const saveAutoSpiritualPreference = (data: any) => {
    http
      .post("/spiritual-preference/spiritual-preference/store", data)
      .then((response: any) => {
        console.log("spiritualPreference", response);
      })
      .catch((error: any) => {
        console.log("spiritualPreference", error);
      });
  };
  const spiritualPreferenceById = async () => {
    http
      .get(`/spiritual-preference/spiritual-preference/${id}`)
      .then((response: any) => {
        console.log('need_hospice_service byId', response);
        setSpiritualPreferenceData(response.data)

      })
      .catch((error: any) => { });
  };
  useEffect(() => {
    spiritualPreferenceById();
  }, []);

  // Add new state for living arrangements
  const [livingArrangements, setLivingArrangements] = useState({
    maritalStatus: '',
    primaryLanguage: '',
    interpreterNeeded: '',
    interpreterId: '',
    learningBarriers: '',
    currentResidence: {
      patientOwned: false,
      familyMember: false,
      boardingHome: false,
      assistedLiving: false,
      other: false,
      otherSpecify: '',
      facilityName: ''
    },
    householdComposition: {
      livesAlone: false,
      withSpouse: false,
      otherFamily: false,
      withFriend: false,
      other: false,
      otherSpecify: ''
    },
    medicationsManaged: {
      patient: false,
      caregiver: false,
      facilityStaff: false,
      other: false,
      otherSpecify: ''
    },
    riskFactors: {
      alcoholDependency: false,
      drugDependency: false,
      smoking: false,
      obesity: false,
      chronicCondition: false,
      culturalPractices: false,
      other: false,
      otherSpecify: ''
    }
  });

  // Add new state for functional limitations
  const [functionalLimitations, setFunctionalLimitations] = useState({
    ambulation: { checked: false, date: null },
    bladderIncontinence: { checked: false, date: null },
    bowelIncontinence: { checked: false, date: null },
    dyspneaExertion: { checked: false, date: null },
    endurance: { checked: false, date: null }
  });

  // Add new state for safety measures
  const [safetyMeasures, setSafetyMeasures] = useState({
    protocol911: { checked: false, date: null },
    clearPathways: { checked: false, date: null },
    diabeticPrecautions: { checked: false, date: null },
    emergencyPlan: { checked: false, date: null },
    fallPrecautions: { checked: false, date: null },
    keepPathwaysClear: { checked: false, date: null },
    supportTransfer: { checked: false, date: null }
  });

  // Add handler for living arrangements changes
  const handleLivingArrangementsChange = (field: string, value: any) => {
    setLivingArrangements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Add handler for nested living arrangements changes
  const handleNestedLivingArrangementsChange = (section: string, field: string, value: any) => {
    setLivingArrangements(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  return (
    <>
      <MainCard title="Spiritual / Existential">
        {hasPermission('spiritual_existential_assessment_section_spiritual_existential_hope_views') && (
          <Grid>
            <div style={{
              borderLeft: '5px solid #2797E2',
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              opacity: hasPermission('spiritual_existential_assessment_section_spiritual_existential_hope_edit') ? 1 : 0.9,
              pointerEvents: hasPermission('spiritual_existential_assessment_section_spiritual_existential_hope_edit') ? 'auto' : 'none'
            }}>
              <div style={{ backgroundColor: '#33B2E494', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Spiritual/Existential Assessment</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 2 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h5" color="dark">
                    Was the patient and/or caregiver asked about spiritual/existential
                  </Typography>
                  <Stack spacing={1.25}>
                    <FormControl component="fieldset">
                      <RadioGroup aria-label="gender" name="gender1" value="2">
                        <Grid container>
                          <Grid item xs={12}>
                            <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="No" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="2" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Yes, and discussion occurred:" />
                          </Grid>
                        </Grid>
                      </RadioGroup>
                    </FormControl>{' '}
                  </Stack>
                  <Grid item xs={12} sx={{ ml: 2, mb: 1 }}>
                    <Typography variant="h5" color="dark" sx={{ mt: 2 }}>
                      Spiritual/Existential Concerns
                    </Typography>
                    <Stack spacing={1.25}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="Patient/caregiver indicated there are no spiritual/existential concerns at present"
                      />
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="Patient/caregiver indicated they are fearful, hopeless, and struggling with the meaning of life/illness."
                      />
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="Need for Spiritual or Religious Support Indicated and Hospice Referrals Made"
                      />
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="Patient/caregiver requested contact with local clergy"
                      />
                      <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Other" />
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      value="2"
                      control={<Radio sx={{ p: 0, pr: 1 }} />}
                      label="Yes, but the patient/responsible party refused to discuss:"
                    />
                  </Grid>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h5" color="dark">
                    Date the patient and/or caregiver was first asked about spiritual/existential concerns:
                  </Typography>
                  <Grid item>
                    <Stack spacing={1.25}>
                      <OutlinedInput id="" type="date" />
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
            </div>
          </Grid>)}
        <Grid container spacing={3}>
          {hasPermission('spiritual_preferences_section_spiritual_existential_hope_views') && (
            <Grid item xs={12}>
              <div
                style={{
                  borderLeft: '5px solid #189AAC',
                  borderRadius: '5px',
                  boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                  opacity: hasPermission('spiritual_preferences_section_spiritual_existential_hope_edit') ? 1 : 0.9,
                  pointerEvents: hasPermission('spiritual_preferences_section_spiritual_existential_hope_edit') ? 'auto' : 'none'
                }}
              >
                <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Spiritual Preferences</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h5" color="dark">
                      Patient's Spiritual Preference
                    </Typography>
                    <Stack spacing={0.25}>
                      <TextField id="outlined-multiline-flexible" multiline maxRows={5} variant="outlined" value={spiritualPreferenceData.patient_spiritual} onChange={
                        (event: any) => {
                          const selected = event.target.value;
                          setSpiritualPreferenceData((prevPatientData: any) => ({
                            ...prevPatientData,
                            patient_spiritual: selected
                          }));
                          saveAutoSpiritualPreference(spiritualPreferenceData)
                        }} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={9}>
                    <Grid item sx={{ pb: 1 }}>
                      <FormControlLabel value="right" control={<Checkbox checked={spiritualPreferenceData.not_religious} value={!spiritualPreferenceData.not_religious} onChange={
                        (event: any) => {
                          const selected = event.target.value;
                          console.log('select', selected);

                          setSpiritualPreferenceData((prevPatientData: any) => ({
                            ...prevPatientData,
                            not_religious: selected
                          }));
                          saveAutoSpiritualPreference(spiritualPreferenceData)
                        }} />} label="Not Religious" />
                    </Grid>
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
                  <Grid item xs={12}>
                    <Stack spacing={0.25}>
                      <TextField id="outlined-multiline-flexible" multiline maxRows={10} variant="outlined" value={spiritualPreferenceData.comments} onChange={
                        (event: any) => {
                          const selected = event.target.value;
                          setSpiritualPreferenceData((prevPatientData: any) => ({
                            ...prevPatientData,
                            comments: selected
                          }));
                          saveAutoSpiritualPreference(spiritualPreferenceData)
                        }} />
                    </Stack>
                  </Grid>
                </Grid>
              </div>
            </Grid>)}
          {hasPermission('plan_of_care_orders_section_spiritual_existential_hope_views') && (
            <Grid item xs={12}>
              <div style={{
                borderLeft: '5px solid #A624E2',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity: hasPermission('plan_of_care_orders_section_spiritual_existential_hope_edit') ? 1 : 0.9,
                pointerEvents: hasPermission('plan_of_care_orders_section_spiritual_existential_hope_edit') ? 'auto' : 'none'
              }}>
                <div style={{ backgroundColor: '#CC58F09F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Plan of Care Orders</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 1 }}>
                  <Grid item xs={12}>
                    <Stack spacing={1.25}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Alteration in Spiritual Status:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Stack>
                    <Grid item xs={12} sx={{ ml: 4, mb: 1 }}>
                      <Typography variant="h5" color="dark">
                        Patient's Spiritual Preference
                      </Typography>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Spiritual Counselor Need:"
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
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Verbalize Feeling Supported" sx={{ m: 0, p: 0 }} />
                        <Grid item xs={12}>
                          <Stack spacing={0.25} sx={{ ml: 4 }}>
                            <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                            <Grid item xs={12} sm={6} md={2}>
                              <Stack spacing={1.25}>
                                <InputLabel htmlFor="">Goal Length</InputLabel>
                                <Select fullWidth id="scale" value="1" placeholder="Select Marital Status">
                                  <MenuItem value="1">30 Days</MenuItem>
                                </Select>
                              </Stack>
                            </Grid>
                          </Stack>
                        </Grid>
                        <Grid>
                          <FormControlLabel
                            value="right"
                            control={<Checkbox sx={{ m: 0, p: 0 }} />}
                            label="Express Acceptance of Health Status:"
                            sx={{ m: 0, p: 0 }}
                          />
                        </Grid>
                        <Grid>
                          <FormControlLabel
                            value="right"
                            control={<Checkbox sx={{ m: 0, p: 0 }} />}
                            label="Reduced Feeling of Burden/Distress:"
                            sx={{ m: 0, p: 0 }}
                          />
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
                      <Grid item xs={12} sx={{ ml: 4, mb: 1 }}>
                        <Typography variant="h5" color="dark">
                          Interventions
                        </Typography>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Perform: Presence and Active Listening:" sx={{ m: 0, p: 0 }} />
                        <Grid item xs={12}>
                          <Stack spacing={0.25} sx={{ ml: 4 }}>
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
                            label="Express Acceptance of Health Status:"
                            sx={{ m: 0, p: 0 }}
                          />
                        </Grid>
                        <Grid>
                          <FormControlLabel
                            value="right"
                            control={<Checkbox sx={{ m: 0, p: 0 }} />}
                            label="Reduced Feeling of Burden/Distress:"
                            sx={{ m: 0, p: 0 }}
                          />
                        </Grid>
                        <Grid>
                          <FormControlLabel
                            value="right"
                            control={<Checkbox sx={{ m: 0, p: 0 }} />}
                            label="Reduced Feeling of Burden/Distress:"
                            sx={{ m: 0, p: 0 }}
                          />
                        </Grid>
                        <Grid>
                          <FormControlLabel
                            value="right"
                            control={<Checkbox sx={{ m: 0, p: 0 }} />}
                            label="Reduced Feeling of Burden/Distress:"
                            sx={{ m: 0, p: 0 }}
                          />
                        </Grid>
                        <Grid>
                          <FormControlLabel
                            value="right"
                            control={<Checkbox sx={{ m: 0, p: 0 }} />}
                            label="Reduced Feeling of Burden/Distress:"
                            sx={{ m: 0, p: 0 }}
                          />
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
            </Grid>)}
        </Grid>
      </MainCard>
      {/* {hasPermission('living_arrangements_section_spiritual_existential_his_views') && ( */}
      <Grid
        container spacing={3}
      >
        <Grid item xs={12}>
          <div style={{
            borderLeft: '5px solid #0AA369',
            borderRadius: '5px',
            boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px', marginBottom: '20px' }}>
              <h2>Living Arrangements/Environmental/Social</h2>
            </div>

            {/* Marital Status */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <Typography variant="subtitle1">Marital Status:</Typography>
              <RadioGroup
                row
                value={livingArrangements.maritalStatus}
                onChange={(e) => handleLivingArrangementsChange('maritalStatus', e.target.value)}
              >
                <FormControlLabel value="married" control={<Radio />} label="Married" />
                <FormControlLabel value="significant" control={<Radio />} label="Significant Other" />
                <FormControlLabel value="divorced" control={<Radio />} label="Divorced" />
                <FormControlLabel value="separated" control={<Radio />} label="Separated" />
                <FormControlLabel value="single" control={<Radio />} label="Single" />
                <FormControlLabel value="widow" control={<Radio />} label="Widow/Widower" />
              </RadioGroup>
            </Grid>

            {/* Primary Language */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Primary Language (Select)</InputLabel>
                <Select
                  value={livingArrangements.primaryLanguage}
                  onChange={(e) => handleLivingArrangementsChange('primaryLanguage', e.target.value)}
                  label="Primary Language (Select)"
                >
                  <MenuItem value="english">English</MenuItem>
                  <MenuItem value="spanish">Spanish</MenuItem>
                  <MenuItem value="french">French</MenuItem>
                  {/* Add more languages as needed */}
                </Select>
              </FormControl>
            </Grid>

            {/* Interpreter needed */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <Typography>Interpreter needed?</Typography>
              <RadioGroup row>
                <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                <FormControlLabel value="no" control={<Radio />} label="No" />
              </RadioGroup>
            </Grid>

            {/* Interpreter ID */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <TextField
                fullWidth
                label="Interpreter ID"
                variant="outlined"
              />
            </Grid>

            {/* Learning barriers */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <TextField
                fullWidth
                label="Learning barriers"
                variant="outlined"
              />
            </Grid>

            {/* Current Residence */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <Typography>Current Residence:</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Patient owned or rented residence"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Family member's residence"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Boarding home or rented room"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Board and care or assisted living facility"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Other (specify):"
                  />
                  <TextField
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Name of facility:"
                    size="small"
                    sx={{ ml: 4 }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Household composition */}
            <Grid item xs={12} sx={{ p: 3 }}    >
              <Typography>Household composition:</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Lives alone"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="With spouse or significant other"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Other family member"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="With friend"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Other:"
                  />
                  <TextField
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Medications managed by */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <Typography>Medications managed by:</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Patient"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Caregiver"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Facility Staff"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Other:"
                  />
                  <TextField
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Risk factors */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <Typography>Risk factors that may impact Care Plan (mark all that apply):</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Alcohol dependency"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Drug dependency"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Smoking"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Obesity"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Chronic condition"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Cultural/Religious practices that may impact care"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox />}
                    label="Other:"
                  />
                  <TextField
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} sx={{ p: 3 }}>
              <Typography variant="h4" sx={{ mb: 3 }}>FUNCTIONAL LIMITATIONS:</Typography>
            </Grid>

            {/* Ambulation */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Set current date when checked
                        setFunctionalLimitations(prev => ({
                          ...prev,
                          ambulation: {
                            checked: true,
                            date: new Date().toISOString().split('T')[0]
                          }
                        }));
                      } else {
                        setFunctionalLimitations(prev => ({
                          ...prev,
                          ambulation: {
                            checked: false,
                            date: null
                          }
                        }));
                      }
                    }}
                    checked={functionalLimitations.ambulation.checked}
                  />
                }
                label={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>Ambulation</span>
                    {functionalLimitations.ambulation.checked && (
                      <TextField
                        type="date"
                        size="small"
                        value={functionalLimitations.ambulation.date || ''}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  </Stack>
                }
              />
            </Grid>

            {/* Bladder incontinence */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFunctionalLimitations(prev => ({
                          ...prev,
                          bladderIncontinence: {
                            checked: true,
                            date: new Date().toISOString().split('T')[0]
                          }
                        }));
                      } else {
                        setFunctionalLimitations(prev => ({
                          ...prev,
                          bladderIncontinence: {
                            checked: false,
                            date: null
                          }
                        }));
                      }
                    }}
                    checked={functionalLimitations.bladderIncontinence.checked}
                  />
                }
                label={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>Bladder incontinence</span>
                    {functionalLimitations.bladderIncontinence.checked && (
                      <TextField
                        type="date"
                        size="small"
                        value={functionalLimitations.bladderIncontinence.date || ''}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  </Stack>
                }
              />
            </Grid>

            {/* Bowel incontinence */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFunctionalLimitations(prev => ({
                          ...prev,
                          bowelIncontinence: {
                            checked: true,
                            date: new Date().toISOString().split('T')[0]
                          }
                        }));
                      } else {
                        setFunctionalLimitations(prev => ({
                          ...prev,
                          bowelIncontinence: {
                            checked: false,
                            date: null
                          }
                        }));
                      }
                    }}
                    checked={functionalLimitations.bowelIncontinence.checked}
                  />
                }
                label={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>Bowel incontinence</span>
                    {functionalLimitations.bowelIncontinence.checked && (
                      <TextField
                        type="date"
                        size="small"
                        value={functionalLimitations.bowelIncontinence.date || ''}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  </Stack>
                }
              />
            </Grid>

            {/* Dyspnea With Min. Exertion */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFunctionalLimitations(prev => ({
                          ...prev,
                          dyspneaExertion: {
                            checked: true,
                            date: new Date().toISOString().split('T')[0]
                          }
                        }));
                      } else {
                        setFunctionalLimitations(prev => ({
                          ...prev,
                          dyspneaExertion: {
                            checked: false,
                            date: null
                          }
                        }));
                      }
                    }}
                    checked={functionalLimitations.dyspneaExertion.checked}
                  />
                }
                label={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>Dyspnea With Min. Exertion</span>
                    {functionalLimitations.dyspneaExertion.checked && (
                      <TextField
                        type="date"
                        size="small"
                        value={functionalLimitations.dyspneaExertion.date || ''}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  </Stack>
                }
              />
            </Grid>

            {/* Endurance */}
            <Grid item xs={12} sx={{ p: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFunctionalLimitations(prev => ({
                          ...prev,
                          endurance: {
                            checked: true,
                            date: new Date().toISOString().split('T')[0]
                          }
                        }));
                      } else {
                        setFunctionalLimitations(prev => ({
                          ...prev,
                          endurance: {
                            checked: false,
                            date: null
                          }
                        }));
                      }
                    }}
                    checked={functionalLimitations.endurance.checked}
                  />
                }
                label={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>Endurance</span>
                    {functionalLimitations.endurance.checked && (
                      <TextField
                        type="date"
                        size="small"
                        value={functionalLimitations.endurance.date || ''}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  </Stack>
                }
              />
            </Grid>
          </div>
        </Grid>
        <Grid item xs={12}>
        <div
          style={{
            borderLeft: '5px solid #189AAC',
            borderRadius: '5px',
            boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
            opacity: hasPermission('spiritual_preferences_section_spiritual_existential_hope_edit') ? 1 : 0.9,
            pointerEvents: hasPermission('spiritual_preferences_section_spiritual_existential_hope_edit') ? 'auto' : 'none'
          }
          }
        >
          <div style={{ backgroundColor: '#189AAC', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
            <h2>Safety/Sanitation risks affecting patient (mark all that apply):</h2>
          </div>
          <Grid
            container
            sx={{
              mb: 4,
              p: 2,
              border: '1px solid #e0e0e0',
              borderRadius: 1
            }}
          >

            {/* Left Column */}
            <Grid item xs={12} md={4}>
              <FormControlLabel control={<Checkbox />} label="Cluttered/Soiled living area" />
              <FormControlLabel control={<Checkbox />} label="Inadequate lighting, heating or cooling" />
              <FormControlLabel control={<Checkbox />} label="Insect/Rodent infestation" />
              <FormControlLabel control={<Checkbox />} label="Lack of safety devices" />
              <FormControlLabel
                control={<Checkbox />}
                label={
                  <Stack direction="row" spacing={1}>
                    <span>Other:</span>
                    <TextField size="small" defaultValue="Inadequate wheelchair size" />
                  </Stack>
                }
              />
            </Grid>

            {/* Middle Column */}
            <Grid item xs={12} md={4}>
              <FormControlLabel control={<Checkbox defaultChecked />} label="Narrow or obstructed walkways" />
              <FormControlLabel control={<Checkbox />} label="No emergency plan in place" />
              <FormControlLabel control={<Checkbox />} label="No gas/electrical appliances" />
              <FormControlLabel control={<Checkbox />} label="No running water" />
            </Grid>

            {/* Right Column */}
            <Grid item xs={12} md={4}>
              <FormControlLabel control={<Checkbox />} label="Oxygen in use" />
              <FormControlLabel control={<Checkbox defaultChecked />} label="Smoking in the home" />
              <FormControlLabel control={<Checkbox />} label="Stairs" />
              <FormControlLabel control={<Checkbox />} label="Unsafe use of assistive devices" />
            </Grid>
          </Grid>

          <Grid
          container
          sx={{
            mb: 4,
            p: 2,
            border: '1px solid #e0e0e0',
            borderRadius: 1
          }}
        >
         
            <Grid item xs={12}>
              <Typography variant="h4" sx={{ mb: 3 }}>Comments:</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                defaultValue="Pt says he is not using his wheelchair nor his walker, but knows he will need a bigger wheelchair later."
              />
            </Grid>
          
        </Grid>

        {/* Safety Measures Section */}
        <Grid
          container
          sx={{
            mb: 4,
            p: 2,
            border: '1px solid #e0e0e0',
            borderRadius: 1
          }}
        >
          <Grid item xs={12}>
            <Typography variant="h4" sx={{ mb: 3 }}>SAFETY MEASURES:</Typography>
          </Grid>

          <Grid container spacing={2}>
            {/* 911 Protocol */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          protocol911: {
                            checked: true,
                            date: new Date().toISOString().split('T')[0]
                          }
                        }));
                      } else {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          protocol911: {
                            checked: false,
                            date: null
                          }
                        }));
                      }
                    }}
                    checked={safetyMeasures.protocol911.checked}
                  />
                }
                label={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>911 Protocol</span>
                    {safetyMeasures.protocol911.checked && (
                      <TextField
                        type="date"
                        size="small"
                        value={safetyMeasures.protocol911.date || ''}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  </Stack>
                }
              />
            </Grid>

            {/* Clear Pathways */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          clearPathways: {
                            checked: true,
                            date: new Date().toISOString().split('T')[0]
                          }
                        }));
                      } else {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          clearPathways: {
                            checked: false,
                            date: null
                          }
                        }));
                      }
                    }}
                    checked={safetyMeasures.clearPathways.checked}
                  />
                }
                label={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>Clear Pathways</span>
                    {safetyMeasures.clearPathways.checked && (
                      <TextField
                        type="date"
                        size="small"
                        value={safetyMeasures.clearPathways.date || ''}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  </Stack>
                }
              />
            </Grid>

            {/* Diabetic precautions */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          diabeticPrecautions: {
                            checked: true,
                            date: new Date().toISOString().split('T')[0]
                          }
                        }));
                      } else {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          diabeticPrecautions: {
                            checked: false,
                            date: null
                          }
                        }));
                      }
                    }}
                    checked={safetyMeasures.diabeticPrecautions.checked}
                  />
                }
                label={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>Diabetic precautions</span>
                    {safetyMeasures.diabeticPrecautions.checked && (
                      <TextField
                        type="date"
                        size="small"
                        value={safetyMeasures.diabeticPrecautions.date || ''}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  </Stack>
                }
              />
            </Grid>

            {/* Emergency Plan Developed */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          emergencyPlan: {
                            checked: true,
                            date: new Date().toISOString().split('T')[0]
                          }
                        }));
                      } else {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          emergencyPlan: {
                            checked: false,
                            date: null
                          }
                        }));
                      }
                    }}
                    checked={safetyMeasures.emergencyPlan.checked}
                  />
                }
                label={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>Emergency Plan Developed</span>
                    {safetyMeasures.emergencyPlan.checked && (
                      <TextField
                        type="date"
                        size="small"
                        value={safetyMeasures.emergencyPlan.date || ''}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  </Stack>
                }
              />
            </Grid>

            {/* Fall Precautions */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          fallPrecautions: {
                            checked: true,
                            date: new Date().toISOString().split('T')[0]
                          }
                        }));
                      } else {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          fallPrecautions: {
                            checked: false,
                            date: null
                          }
                        }));
                      }
                    }}
                    checked={safetyMeasures.fallPrecautions.checked}
                  />
                }
                label={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>Fall Precautions</span>
                    {safetyMeasures.fallPrecautions.checked && (
                      <TextField
                        type="date"
                        size="small"
                        value={safetyMeasures.fallPrecautions.date || ''}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  </Stack>
                }
              />
            </Grid>

            {/* Keep Pathways Clear */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          keepPathwaysClear: {
                            checked: true,
                            date: new Date().toISOString().split('T')[0]
                          }
                        }));
                      } else {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          keepPathwaysClear: {
                            checked: false,
                            date: null
                          }
                        }));
                      }
                    }}
                    checked={safetyMeasures.keepPathwaysClear.checked}
                  />
                }
                label={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>Keep Pathways Clear</span>
                    {safetyMeasures.keepPathwaysClear.checked && (
                      <TextField
                        type="date"
                        size="small"
                        value={safetyMeasures.keepPathwaysClear.date || ''}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  </Stack>
                }
              />
            </Grid>

            {/* Support During Transfer and Ambulation */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          supportTransfer: {
                            checked: true,
                            date: new Date().toISOString().split('T')[0]
                          }
                        }));
                      } else {
                        setSafetyMeasures(prev => ({
                          ...prev,
                          supportTransfer: {
                            checked: false,
                            date: null
                          }
                        }));
                      }
                    }}
                    checked={safetyMeasures.supportTransfer.checked}
                  />
                }
                label={
                  <Stack direction="row" spacing={2} alignItems="center">
                    <span>Support During Transfer and Ambulation</span>
                    {safetyMeasures.supportTransfer.checked && (
                      <TextField
                        type="date"
                        size="small"
                        value={safetyMeasures.supportTransfer.date || ''}
                        InputProps={{ readOnly: true }}
                      />
                    )}
                  </Stack>
                }
              />
            </Grid>
          </Grid>
        </Grid>
          </div>
        </Grid>
        {/* Comments Section */}
        <Grid item xs={12}>
        
        
        </Grid>
      </Grid>
      {/* )} */}
    </>
  );
};

export default SpiritualExistentialPage;

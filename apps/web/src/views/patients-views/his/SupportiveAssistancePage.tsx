import {
    Grid,
    Stack,
    InputLabel,
    OutlinedInput,
    Button,
    Select,
    MenuItem,
    Typography,
    FormControl,
    FormLabel,
    Radio,
    FormControlLabel,
    RadioGroup,
    Checkbox,
    TextField
  } from '@mui/material';
  import MainCard from 'components/MainCard';
  import http from "../../../hooks/useCookie";
import { useEffect, useState } from 'react';
import AuthService from 'types/AuthService';
  const needData  = [
    { id:1,
      name: 'Need Hospice Aide Services',},
    { id:2,
      name: 'Need for volunteer Services',}
    ]
  const SupportiveAssistancePage = ({ id }: { id: string }) => {
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
    const [checkedSupportive, setCheckedSupportive] = useState<{ [key: string]: boolean }>({});
    const [livingArrangementsData, setLivingArrangementsData] = useState<any>({
      primary_caregiver: "",
      patient_able: false,
      caregiver_availability: "",
      primary_location_of_patient: "",
      need_hospice_service: 0,
      patient_id: id
    });
    const saveAutoLivingArrangements = (data:any) => {
      console.log('livingArrangements',data);
      
        http
        .post("/living-arrangements/living-arrangements/store",data)
        .then( (response: any) => {
          console.log("living",response);
        })
        .catch((error:any) => {
          console.log("Arrangements",error);
        });
    };
    const supportiveAssistanceById = async () => {
      http
        .get(`/living-arrangements/living-arrangements/${id}`)
        .then((response: any) => {
          console.log('need_hospice_service byId', response);
  setLivingArrangementsData(response.data)
          if (response.data.need_hospice_service) {
            const idArray = response.data.need_hospice_service.split(',');
            const checkedState: { [key: string]: boolean } = { ...checkedSupportive };
            idArray.forEach((id: any) => {
              checkedState[id] = true;
            });
            setCheckedSupportive(checkedState);
          }
        })
        .catch((error: any) => {});
    };
    const handleCheckboxChange = (ids: any) => {
      // Inverser l'état de la case cochée/décochée
      const updatedCheckedSupportive: { [key: string]: boolean } = {
        ...checkedSupportive,
        [ids]: !checkedSupportive[ids]
      };
      // Mettre à jour l'état local des cases cochées
      setCheckedSupportive(updatedCheckedSupportive);
      // Récupérer les ID des problèmes cochés
      const selectedsupportiveIds = Object.keys(updatedCheckedSupportive).filter((key) => updatedCheckedSupportive[key]);
      livingArrangementsData.need_hospice_service = selectedsupportiveIds;
      setLivingArrangementsData((prevData: any) => ({
        ...prevData,
        need_hospice_service: selectedsupportiveIds
      }));
      saveAutoLivingArrangements(livingArrangementsData)
    };
    useEffect(() => {
      supportiveAssistanceById();
      }, []);
    return (
      <>
        <MainCard title="Supportive Assistance">
        {hasPermission('living_arrangements_section_supportive_assistance_hope_views') && (
          <Grid>
            <div style={{ 
              borderLeft: '5px solid #2797E2', 
              borderRadius: '5px', 
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              opacity:hasPermission('living_arrangements_section_supportive_assistance_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('living_arrangements_section_supportive_assistance_hope_edit') ? 'auto':'none'
               }}>
              <div style={{ backgroundColor: '#33B2E494', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Living Arrangements</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 2 }}>
              <Grid item xs={12} md={6}>
                  <Typography variant="h5" color="dark">
                   Primary Caregiver
                  </Typography>
                  <Grid item>
                    <Stack spacing={1.25}>
                      <OutlinedInput id="" type="text" value={livingArrangementsData.primary_caregiver} onChange={
                 (event: any) => {
                  const selected = event.target.value;
                  setLivingArrangementsData((prevPatientData: any) => ({
                    ...prevPatientData,
                    primary_caregiver: selected
                  }));
                  saveAutoLivingArrangements(livingArrangementsData)
                }}/>
                    </Stack>
                  </Grid>
                </Grid> <Grid item xs={12} md={6}>
                  <Typography variant="h5" color="dark">
                   Primary Location of Patient
                  </Typography>
                  <Grid item>
                    <Stack spacing={1.25}>
                      <OutlinedInput id="" type="text" value={livingArrangementsData.primary_location_of_patient} onChange={
                 (event: any) => {
                  const selected = event.target.value;
                  setLivingArrangementsData((prevPatientData: any) => ({
                    ...prevPatientData,
                    primary_location_of_patient: selected
                  }));
                  saveAutoLivingArrangements(livingArrangementsData)
                }}/>
                    </Stack>
                  </Grid>
                </Grid> <Grid item xs={12} md={6}>
                  <Typography variant="h5" color="dark">
                   Caregiver Availability and willingness
                  </Typography>
                  <Grid item>
                    <Stack spacing={1.25}>
                      <OutlinedInput id="" type="text" value={livingArrangementsData.caregiver_availability} onChange={
                 (event: any) => {
                  const selected = event.target.value;
                  setLivingArrangementsData((prevPatientData: any) => ({
                    ...prevPatientData,
                    caregiver_availability: selected
                  }));
                  saveAutoLivingArrangements(livingArrangementsData)
                }}/>
                    </Stack>
                  </Grid>
                </Grid> <Grid item xs={12} md={6}>
                  <Typography variant="h5" color="dark">
                    Type of Assistance
                  </Typography>
                  <Grid item>
                    <Stack spacing={1.25}>
                      <OutlinedInput id="" type="text" value={livingArrangementsData.type_assistance} onChange={
                 (event: any) => {
                  const selected = event.target.value;
                  setLivingArrangementsData((prevPatientData: any) => ({
                    ...prevPatientData,
                    type_assistance: selected
                  }));
                  saveAutoLivingArrangements(livingArrangementsData)
                }}/>
                    </Stack>
                  </Grid>
                </Grid>
                <Grid item xs={12} md={6} >
                  <Typography variant="h5" color="dark">
                   Patient Able to Participate in Their Own Care
                  </Typography>
                  <Stack spacing={1.25}>
                    <FormControl component="fieldset">
                      <RadioGroup aria-label="patient_able" value={livingArrangementsData.patient_able  ? '1' : '0'} onChange={
                 (event: any) => {
                  const selected = event.target.value === '1';
                  setLivingArrangementsData((prevPatientData: any) => ({
                    ...prevPatientData,
                    patient_able: selected
                  }));
                  saveAutoLivingArrangements(livingArrangementsData)
                }}>
                        <Grid container>
                          <Grid item xs={12}>
                            <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Yes" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="0" control={<Radio sx={{ p: 0, pr: 1 }} />} label="No" />
                          </Grid>
                        </Grid>
                      </RadioGroup>
                    </FormControl>{' '}
                  </Stack>
                 
                </Grid>
                  <Grid item xs={12} md={6}>
                  {needData.map((supportive) => (
                      <FormControlLabel
                        key={supportive.id}
                        control={
                          <Checkbox
                            sx={{ m: 0, p: 0 }}
                            value={supportive.id}
                            checked={Boolean(checkedSupportive[supportive.id])}
                            onChange={() => handleCheckboxChange(supportive.id.toString())}
                          />
                        }
                        label={supportive.name}
                      />
                    ))}
                  </Grid>
              </Grid>
            </div>
          </Grid> )}
          <Grid container spacing={3}>
             {hasPermission('diagnosis_section_supportive_assistance_hope_views') && (
          <Grid item xs={12} sm={12} md={6}>
            <div style={{ 
              borderLeft: '5px solid #189AAC', 
              borderRadius: '5px', 
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              minHeight:'630px',
              opacity:hasPermission('diagnosis_section_supportive_assistance_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('diagnosis_section_supportive_assistance_hope_edit') ? 'auto':'none' }}>
              <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Diagnosis</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Assigned To:</InputLabel>
                  <TextField id="outlined-multiline-flexible" variant="outlined" />
                </Stack>
              </Grid>
                <Grid item xs={12} sm={6}>
                  <Stack spacing={1.25}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Principal Dignosis</FormLabel>
                      <RadioGroup aria-label="gender" name="gender1" value="3">
                        <Grid container>
                          <Grid item xs={12}>
                            <FormControlLabel value="1" control={<Radio />} label="Cancer" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="2" control={<Radio />} label="Dementia/Alzheimer's" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="3" control={<Radio />} label="None of the Above" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="4" control={<Radio />} label="Dementia/Alzheimer's" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="5" control={<Radio />} label="None of the Above" />
                          </Grid>
                        </Grid>
                      </RadioGroup>
                    </FormControl>
                  </Stack>
                </Grid>
              </Grid>
            </div>
          </Grid> )}
           {hasPermission('Prognosis_section_supportive_assistance_hope_views') && (
          <Grid item xs={12} sm={12} md={6}>
            <div style={{ 
              borderLeft: '5px solid #189AAC', 
              borderRadius: '5px', 
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)' ,
              minHeight:'630px',
              opacity:hasPermission('Prognosis_section_supportive_assistance_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('Prognosis_section_supportive_assistance_hope_edit') ? 'auto':'none'
              }}>
              <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Prognosis</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                <Typography variant="h5" color="dark">
                  Patient:
                  </Typography>
                  <Stack spacing={1.25}>
                    <FormControlLabel value="right" control={<Checkbox  sx={{ m: 0, p: 0 }}/>} label="No Problems identified" sx={{ m: 0, p: 0 }} />
                    <FormControlLabel value="right" control={<Checkbox  sx={{ m: 0, p: 0 }}/>} label="Home Environment/Safety Concerns:"  sx={{ m: 0, p: 0 }}/>
                    <FormControlLabel value="right" control={<Checkbox  sx={{ m: 0, p: 0 }}/>} label="Suspected Abuse/Neglect:" />
                    <FormControlLabel value="right" control={<Checkbox  sx={{ m: 0, p: 0 }}/>} label="Community Resources Requested:" />
                  </Stack>
                </Grid>
                <Grid item xs={12}   sx={{ ml: 4 }}>
                  <Stack spacing={1.25}>
                    <FormControlLabel value="right" control={<Checkbox   sx={{ p: 0 }}/>} label="Meals on Wheels" />
                    <FormControlLabel value="right" control={<Checkbox  sx={{ p: 0 }}/>} label="Support Groups" />
                    <FormControlLabel value="right" control={<Checkbox  sx={{  p: 0 }}/>} label="Medication Assistance Programs" />
                    <FormControlLabel value="right" control={<Checkbox  sx={{  p: 0 }}/>} label="Centre for Independent Living" />
                    <FormControlLabel value="right" control={<Checkbox   sx={{ p: 0 }}/>} label="Protect and Advocacy Agency" />
                    <FormControlLabel value="right" control={<Checkbox  sx={{ p: 0 }}/>} label="Aging and Disability Resource Center" />
                    <FormControlLabel value="right" control={<Checkbox  sx={{  p: 0 }}/>} label="Other:" />
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <FormControlLabel value="right" control={<Checkbox  sx={{ p: 0 }}/>} label="Community Resource Providing Assistance:" />
                  </Stack>
                   <Grid>
                   <Button variant="contained" type="submit"  sx={{ mb: 2,mt:2 }}>
                   Emergency Preparedness
                  </Button>
                   </Grid>
                   <Grid>
                  <Button variant="contained" type="submit"  >
                   Bereavement Assessment
                  </Button>

                   </Grid>
                </Grid>
              
              </Grid>
            </div>
          </Grid> )}
        </Grid>
        {hasPermission('plan_of_care_orders_section_supportive_assistance_hope_views') && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{ 
                borderLeft: '5px solid #A624E2', 
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity:hasPermission('plan_of_care_orders_section_supportive_assistance_hope_edit')? 1 :0.9,
                  pointerEvents:hasPermission('plan_of_care_orders_section_supportive_assistance_hope_edit') ? 'auto':'none'
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
                        label="Alteration in Spiritual Status:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Stack>
                    <Stack spacing={1.25}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Alteration in Spiritual Status:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Stack>
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
                        Patien's Spiritual Preference
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
                      <Stack spacing={0.25} sx={{ml:4}}>
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
            </Grid>
          </Grid> )}
        </MainCard>
      </>
    );
  };
  
  export default SupportiveAssistancePage;
  

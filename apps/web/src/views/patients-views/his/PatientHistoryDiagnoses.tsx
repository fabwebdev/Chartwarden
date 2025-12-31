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
  Checkbox
} from '@mui/material';
import http from '../../../hooks/useCookie';
import MainCard from 'components/MainCard';
import { useEffect, useState } from 'react';
import AuthService from 'types/AuthService';

const PatientHistoryDiagnosesPage = ({ id }: { id: string }) => {
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
  const [prognosisPatientData, setPrognosisPatientData] = useState<{ id: string; name: string }[]>([]);
  const [prognosisCaregiverData, setPrognosisCaregiverData] =  useState<{ id: string; name: string }[]>([]);
  const [prognosisImminenceData, setPrognosisImminenceData] = useState<{ id: string; name: string }[]>([]);
  // const selectedPrognosisIds = Object.keys(updatedCheckedPrognosiss).filter(key => updatedCheckedPrognosiss[key]);
  const [checkedPrognosisPatient, setCheckedPrognosisPatient] =  useState<{ [key: string]: boolean }>({});
  const [checkedPrognosisCaregiver, setCheckedPrognosisCaregiver] =  useState<{ [key: string]: boolean }>({});
  const [checkedPrognosisImminence, setCheckedPrognosisImminencer] =  useState<{ [key: string]: boolean }>({});
  const [checkedPrognosisPatientIs, setCheckedPrognosisPatientIs] = useState(false);

  const handleCheckboxChange = (ids: any, type: string) => {
    console.log('id chekbox', ids);
    // Convertit la valeur de la case à cocher en booléen
    // Crée une copie de l'état actuel
    let updatedCheckedPrognosisPatient = { ...checkedPrognosisPatient };
    let updatedCheckedPrognosisCaregiver = { ...checkedPrognosisCaregiver };
    let updatedCheckedPrognosisImminence = { ...checkedPrognosisImminence };

    // Met à jour l'état de la case cochée en fonction du type
    if (type === 'patient') {
      updatedCheckedPrognosisPatient = {
        ...checkedPrognosisPatient,
        [ids]: !checkedPrognosisPatient[ids]
      };
    } else if (type === 'caregiver') {
      updatedCheckedPrognosisCaregiver = {
        ...checkedPrognosisCaregiver,
        [ids]: !checkedPrognosisCaregiver[ids]
      };
    } else if (type === 'imminence') {
      updatedCheckedPrognosisImminence = {
        ...checkedPrognosisImminence,
        [ids]: !checkedPrognosisImminence[ids]
      };
    } else if (type === 'patientIs') {
      setCheckedPrognosisPatientIs(!checkedPrognosisPatientIs);
    }

    // Mettre à jour l'état local des cases cochées
    setCheckedPrognosisPatient(updatedCheckedPrognosisPatient);
    setCheckedPrognosisCaregiver(updatedCheckedPrognosisCaregiver);
    setCheckedPrognosisImminencer(updatedCheckedPrognosisImminence);

    // Filtrer les ID sélectionnés en fonction du type (patient ou caregiver)
    const selectedPatientIds = Object.keys(updatedCheckedPrognosisPatient).filter((key) => updatedCheckedPrognosisPatient[key]);
    const selectedCaregiverIds = Object.keys(updatedCheckedPrognosisCaregiver).filter((key) => updatedCheckedPrognosisCaregiver[key]);
    const selectedImminenceIds = Object.keys(updatedCheckedPrognosisImminence).filter((key) => updatedCheckedPrognosisImminence[key]);
    // Construire l'objet de données à envoyer dans la requête POST
    const data = {
      patient_id: id,
      prognosis_patient_is_imminent: type === 'patientIs' ? checkedPrognosisPatientIs ? '0' : '1' : '',
      prognosis_caregiver_id: type === 'caregiver' ? selectedCaregiverIds : [],
      prognosis_patient_id: type === 'patient' ? selectedPatientIds : [],
      prognosis_imminence_id: type === 'imminence' ? selectedImminenceIds : []
    };
    // Envoyer la requête POST pour mettre à jour les données sur le serveur
    http
      .post(`/prognosis/prognosis/store`, data)
      .then((response: any) => {
      })
      .catch((error: any) => {
        console.log('error',error);
        
      });
  };

  const prognosisPatient = async () => {
    http
      .get(`/select/prognosis-patient-list`)
      .then((response: any) => {
        setPrognosisPatientData(response.data);
      })
      .catch((error: any) => {});
  };
  const prognosisCaregiver = async () => {
    http
      .get(`/select/prognosis-caregiver`)
      .then((response: any) => {
        setPrognosisCaregiverData(response.data);
      })
      .catch((error: any) => {});
  };
  const prognosis = async () => {
    http
      .get(`/prognosis/prognosis/${id}`)
      .then((response: any) => {
        setCheckedPrognosisPatientIs(response.data.prognosis_patient_is_imminent);
        // Si des données de patient sont présentes
        if (response.data.prognosis_patient_id) {
          const idArray = response.data.prognosis_patient_id.split(',');
          const checkedState = { ...checkedPrognosisPatient };
          idArray.forEach((id:any) => {
            checkedState[id] = true;
          });
          setCheckedPrognosisPatient(checkedState);
        }
        // Si des données d'aidant sont présentes
        if (response.data.prognosis_caregiver_id) {
          const idArray = response.data.prognosis_caregiver_id.split(',');
          const checkedStates = { ...checkedPrognosisCaregiver };
          idArray.forEach((id:any) => {
            checkedStates[id] = true;
          });
          setCheckedPrognosisCaregiver(checkedStates);
        }
        // Si des données d'aidant sont présentes
        if (response.data.prognosis_imminence_id) {
          const idArray = response.data.prognosis_imminence_id.split(',');
          const checkedStatesImminencer = { ...checkedPrognosisImminence };
          idArray.forEach((id:any) => {
            checkedStatesImminencer[id] = true;
          });
          setCheckedPrognosisImminencer(checkedStatesImminencer);
        }
      })
      .catch((error: any) => {});
  };

  const prognosisImminence = async () => {
    http
      .get(`/select/prognosis-imminence`)
      .then((response: any) => {
        setPrognosisImminenceData(response.data);
      })
      .catch((error: any) => {});
  };

  useEffect(() => {
    prognosis();
    prognosisCaregiver();
    prognosisImminence();
    prognosisPatient();
  }, []);

  return (
    <>
      <MainCard title="Patient History & Diagnoses">
      {hasPermission('vital_signs_section_patient_history_diagnoses_hope_views') && (
        <Grid>
          <div style={{ 
            borderLeft: '5px solid #2797E2', 
            borderRadius: '5px', 
            boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
            opacity:hasPermission('vital_signs_section_patient_history_diagnoses_hope_edit')? 1 :0.9,
            pointerEvents:hasPermission('vital_signs_section_patient_history_diagnoses_hope_edit') ? 'auto':'none' 
            }}>
            <div style={{ backgroundColor: '#33B2E494', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
              <h2>Vital Signs/Additional Measurements</h2>
            </div>
            <Button variant="contained" type="submit" sx={{ ml: 1 }}>
              View Vital Signs
            </Button>
            <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Temperature</InputLabel>
                  <OutlinedInput id="" type="text" />
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Scale</InputLabel>
                  <Select fullWidth id="scale" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">M</MenuItem>
                  </Select>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Route</InputLabel>
                  <Select fullWidth id="route" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">Temporal</MenuItem>
                  </Select>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">O2 Saturation (%)</InputLabel>
                  <OutlinedInput id="" type="text" placeholder="99" />
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Method</InputLabel>
                  <Select fullWidth id="Gender" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">On Room Air</MenuItem>
                  </Select>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Pulse Rate (/min)</InputLabel>
                  <OutlinedInput id="" placeholder="" type="text" />
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Location</InputLabel>
                  <Select fullWidth id="Gender" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">Apical Lying</MenuItem>
                  </Select>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Respiration(/min)</InputLabel>
                  <OutlinedInput id="" placeholder="16" type="text" />
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Blood Pressure (mmHg)</InputLabel>
                  <OutlinedInput id="" type="text" placeholder="99" />
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Position</InputLabel>
                  <Select fullWidth id="Gender" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">On Room Air</MenuItem>
                  </Select>
                </Stack>
              </Grid>
            </Grid>
            <Button variant="contained" type="submit" sx={{ ml: 1 }}>
              Additional Measurements
            </Button>
            <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Mid-Arm Crirumference (cm)</InputLabel>
                  <OutlinedInput id="" type="text" />
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Arm</InputLabel>
                  <Select fullWidth id="scale" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">M</MenuItem>
                  </Select>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Weight</InputLabel>
                  <OutlinedInput id="" type="text" placeholder="122" />
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Scales</InputLabel>
                  <Select fullWidth id="scale" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">Lbs</MenuItem>
                  </Select>
                </Stack>
              </Grid>

              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Height</InputLabel>
                  <Select fullWidth id="height" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">60</MenuItem>
                  </Select>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Scales</InputLabel>
                  <Select fullWidth id="scale" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">Lbs</MenuItem>
                  </Select>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">BMI</InputLabel>
                  <OutlinedInput id="" placeholder="" type="text" />
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">Abdominal Girth (cm)</InputLabel>
                  <Select fullWidth id="scale" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">Lbs</MenuItem>
                  </Select>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">FAST:</InputLabel>
                  <Select fullWidth id="scale" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">Lbs</MenuItem>
                  </Select>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">NYHA:</InputLabel>
                  <Select fullWidth id="scale" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">Lbs</MenuItem>
                  </Select>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">PPS Score:</InputLabel>
                  <Select fullWidth id="Gender" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">On Room Air</MenuItem>
                  </Select>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="">PPS Score:</InputLabel>
                  <Select fullWidth id="Gender" value="" placeholder="Select Marital Status">
                    <MenuItem value="1">On Room Air</MenuItem>
                  </Select>
                </Stack>
              </Grid>
            </Grid>
          </div>
        </Grid>
  )}
        <Grid container spacing={3}>
           {hasPermission('dignosis_section_patient_history_diagnoses_hope_views') && (
          <Grid item xs={12} sm={12} md={6}>
            <div
              style={{
                borderLeft: '5px solid #189AAC',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '600px',
                opacity:hasPermission('dignosis_section_patient_history_diagnoses_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('dignosis_section_patient_history_diagnoses_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Diagnosis</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
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
                        </Grid>
                      </RadioGroup>
                    </FormControl>
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h5" color="dark">
                    Terminal Diagnosis
                  </Typography>
                  <Typography variant="body2" color="secondary">
                    150.21 Acute systolic (congestive heart failure)
                  </Typography>
                  <Typography variant="h5" color="dark">
                    Comorbidities
                  </Typography>
                  <Typography variant="body2" color="secondary">
                    150.21 Acute systolic (congestive heart failure)
                  </Typography>
                  <Button variant="contained" type="submit" sx={{ mt: 1 }}>
                    Add Diagnosis
                  </Button>
                </Grid>
              </Grid>
            </div>
          </Grid>
  )}
{hasPermission('prognosis_section_patient_history_diagnoses_hope_views') && (
          <Grid item xs={12} sm={12} md={6}>
            <div
              style={{
                borderLeft: '5px solid #189AAC',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '600px',
                opacity:hasPermission('prognosis_section_patient_history_diagnoses_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('prognosis_section_patient_history_diagnoses_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Prognosis</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h5" color="dark">
                    Patient:
                  </Typography>
                  <Stack spacing={1.25}>
                    {prognosisPatientData.map((patient) => (
                      <FormControlLabel
                        key={patient.id}
                        control={
                          <Checkbox
                            sx={{ m: 0, p: 0 }}
                            value={patient.id}
                            checked={Boolean(checkedPrognosisPatient[patient.id])}
                            onChange={() => handleCheckboxChange(patient.id.toString(), 'patient')} // Envoyer le type 'patient' avec l'ID
                          />
                        }
                        label={patient.name}
                      />
                    ))}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h5" color="dark">
                    Caregiver:
                  </Typography>
                  <Stack spacing={1.25}>
                    {prognosisCaregiverData.map((caregiver) => (
                      <FormControlLabel
                        key={caregiver.id}
                        control={
                          <Checkbox
                            sx={{ m: 0, p: 0 }}
                            value={caregiver.id}
                            checked={Boolean(checkedPrognosisCaregiver[caregiver.id])}
                            onChange={() => handleCheckboxChange(caregiver.id.toString(), 'caregiver')} // Envoyer le type 'caregiver' avec l'ID
                          />
                        }
                        label={caregiver.name}
                      />
                    ))}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h5" color="dark">
                    Imminence of Death:
                  </Typography>
                  <Stack spacing={1.25}>
                    {prognosisImminenceData.map((imminence) => (
                      <FormControlLabel
                        key={imminence.id}
                        control={
                          <Checkbox
                            sx={{ m: 0, p: 0 }}
                            checked={Boolean(checkedPrognosisImminence[imminence.id])}
                            onChange={() => handleCheckboxChange(imminence.id.toString(), 'imminence')}
                          />
                        }
                        label={imminence.name} // Assurez-vous que patient.name correspond au nom de votre patient
                      />
                    ))}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl component="fieldset">
                    <Typography variant="h5" color="dark">
                      Patient is Imminent
                    </Typography>
                    <RadioGroup
  aria-label="patientIs"
  value={checkedPrognosisPatientIs ? '1' : '0'} // Définir la valeur de la case à cocher en fonction de l'état
  onChange={(event) => handleCheckboxChange(event.target.value, 'patientIs')} // Gérer le changement de la case à cocher
>
  <FormControlLabel value="1" control={<Radio />} label="Yes" />
  <FormControlLabel value="0" control={<Radio />} label="No" />
</RadioGroup>
                  </FormControl>
                </Grid>
              </Grid>
            </div>
          </Grid>
          )}

          {/* {hasPermission('medical_history_narrative_section_patient_history_diagnoses_his_views') && ( */}
            <Grid item xs={12}>
              <div style={{ 
                borderLeft: '5px solid #189AAC', 
                borderRadius: '5px', 
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity: hasPermission('medical_history_narrative_section_patient_history_diagnoses_his_edit') ? 1 : 0.9,
                pointerEvents: hasPermission('medical_history_narrative_section_patient_history_diagnoses_his_edit') ? 'auto' : 'none'
              }}>
                <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Medical History Narrative</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 1 }}>
                  <Grid item xs={12}>
                    <Stack spacing={1.25}>
                      <InputLabel htmlFor="medical-history">Medical History Comments</InputLabel>
                      <OutlinedInput
                        id="medical-history"
                        multiline
                        rows={4}
                        fullWidth
                        placeholder="Enter medical history details here..."
                      />
                    </Stack>
                  </Grid>
                </Grid>
              </div>
            </Grid>
          {/* )} */}



              {hasPermission('plan_of_care_orders_section_patient_history_diagnoses_hope_views') && (
          <Grid item xs={12}>
            <div style={{ 
              borderLeft: '5px solid #A624E2', 
              borderRadius: '5px', 
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              opacity:hasPermission('plan_of_care_orders_section_patient_history_diagnoses_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('plan_of_care_orders_section_patient_history_diagnoses_hope_edit') ? 'auto':'none' 
               }}>
              <div style={{ backgroundColor: '#CC58F09F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Plan of Care Orders</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Imminent Death .Terminal Decline:"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Other:" sx={{ m: 0, p: 0 }} />
                  </Stack>
                </Grid>
              </Grid>
            </div>
          </Grid>  )}
        </Grid>
      </MainCard>
    </>
  );
};

export default PatientHistoryDiagnosesPage;


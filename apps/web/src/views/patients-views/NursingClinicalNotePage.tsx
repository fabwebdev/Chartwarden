'use client';

import {
  Button,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import Avatar from 'components/@extended/Avatar';
import MainCard from 'components/MainCard';
import { useEffect, useState,useRef } from 'react';
import AuthService from 'types/AuthService';
import { ThemeMode } from 'types/config';
import http from "../../hooks/useCookie";
import ReactToPrint from 'react-to-print';
import '../../app/print.css';
import { useParams, useRouter } from 'next/navigation';
import { usePatientStore } from '../../store/patientStore';

const painDataInitialState = {
  pain_level_now: '',
  pain_right: '',
  pain_left: '',
  pain_acceptable_level: '',
  pain_rated_by: [] as string[],
  respiratory_rhythm: '',
  pain_observations: [] as string[],
  pain_duration: [] as string[],
  pain_frequency: [] as string[],
  pain_character: [] as string[],
  worsened_by: [] as string[],
  relieved_by: [] as string[],
  effects_on_function: [] as string[],
  current_pain_management: '',
  breakthrough_pain: [] as string[],
  additional_pain_information: '',
};

type PainDataState = typeof painDataInitialState;


const painadDataInitialState = {
  pain_assessment_behavior: '',
  pain_assessment_negative_vocalizations: '',
  pain_assessment_facial_expression: '',
  pain_assessment_body_language: '',
  pain_consolability: '',
  painad_total_score: 0,
};

type PainadDataState = typeof painadDataInitialState;



const avatarImage = '/assets/images/users';
const NursingClinicalNotePage = () => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const {logout} = AuthService();
  const url = window.location.href;
    const noteId = url.substring(url.lastIndexOf('/') + 1);
  // const noteId = 1;
   const matchDownSM = useMediaQuery(theme.breakpoints.down('sm'));
   const componentRef = useRef(null); 
  const [patientData, setPatientData] = useState<any>({
    first_name: '',
    last_name: '',
    mi: '',
    preferred_name: '',
    date_of_birth: '',
    suffix: '',
    ssn: '',
    dnr_id: '',
    hipaa_received: '',
    race_ethnicity_id: '',
    liaison_primary_id: '',
    emergency_preparedness_level_id: '',
    oxygen_dependent_id: '',
    patient_consents: '',
    genders: '',
    dme_provider_id: '',
    patient_pharmacy_id: '',
    primary_diagnosis_id: ''
  });
  const { id } = useParams();
  const { selectedPatientId, selectedPatientData, setSelectedPatient } = usePatientStore();
  
  const fetchPatientData = async (patientId?: string | number) => {
    // Use patient ID from store if available, otherwise use params
    const patientIdToFetch = patientId || selectedPatientId || id;
    
    if (!patientIdToFetch) {
      console.warn('No patient ID available for fetching');
      return;
    }
    
    // If we have patient data in store and it matches the ID, use it first
    if (selectedPatientData && selectedPatientId && selectedPatientId === patientIdToFetch) {
      console.log('Using patient data from Zustand store:', selectedPatientData);
      setPatientData(selectedPatientData);
      return;
    }
    
    // Otherwise fetch from API
    http
      .get(`/patient/${patientIdToFetch}`)
      .then((response: any) => {
        console.log('Patient data loaded from API:', response.data);
        const patientData = response.data;
        setPatientData(patientData);
        
        // Update the store with the fetched data
        if (patientData && patientData.id) {
          setSelectedPatient(patientData.id, patientData);
        }
      })
      .catch((error: any) => {
        console.error('Error fetching patient data:', error);
      });
  };
  const router = useRouter();
  const params = useParams();
  console.log('noteId '+ noteId);
  // const [noteData, setNoteData] = useState({
  //   note_date: '',
  //   time_in: '',
  //   time_out: '',
  //   patient_name: '',
  //   patient_number: '',
  //   location_name: '',
  //   benefit_period: '',
  //   dob: '',
  //   location_number: '',
  //   prn_visit: false,
  //   benefit_period_dates: '',
  //   patient_identifiers: [] as string[],
  // });

  const [noteData, setNoteData] = useState({
    note_date: '',
    time_in: '',
    time_out: '',
    patient_name: '',
    patient_number: '',
    location_name: '',
    benefit_period: {
      period_number: '',
      start_date: '',
      end_date: '',
    },
    dob: '',
    location_number: '',
    prn_visit: false,
    benefit_period_dates: '',
    patient_identifiers: [] as string[],
  });
  

  // useEffect(() => {
  //   axios.get(`http://127.0.0.1:3000/api/nursing-clinical-notes/nursing-clinical-notes/${noteId}`)
  //       .then(response => {
  //           setNoteData(response.data);
  //       })
  //       .catch(error => {
  //           console.error('Error fetching data:', error);
  //       });
  // }, [noteId]);

  useEffect(() => {
    http.get(`/nursing-clinical-notes/nursing-clinical-notes/${noteId}`)
      .then(response => {
        const data = response.data;
        setNoteData({
          note_date: data.note_date || '',
          time_in: data.time_in || '',
          time_out: data.time_out || '',
          patient_name: data.patient_name || '',
          patient_number: data.patient_number || '',
          location_name: data.location_name || '',
          benefit_period: data.benefit_period || '',
          dob: data.dob || '',
          location_number: data.location_number || '',
          prn_visit: data.prn_visit || false,
          benefit_period_dates: data.benefit_period_dates || '',
          patient_identifiers: data.patient_identifiers || [],
        });
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, [noteId]);

  const handleChangeNoteData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let updatedData = { ...noteData };
  
    if (type === 'checkbox') {
      if (name === "patient_identifiers") {
        if (checked) {
          updatedData.patient_identifiers = [...updatedData.patient_identifiers, value];
        } else {
          updatedData.patient_identifiers = updatedData.patient_identifiers.filter((item) => item !== value);
        }
      } else {
        updatedData = { ...noteData, [name]: checked };
      }
    } else {
      updatedData = { ...noteData, [name]: value };
    }
  
    setNoteData(updatedData);
  
    http.post(`/nursing-clinical-notes/nursing-clinical-notes/${noteId}`, updatedData)
      .then(response => {
        console.log('Data saved:', response.data);
      })
      .catch(error => {
        console.error('Error saving data:', error);
      });
  };
  

  // useEffect(() => {
  //   if (noteId) {
  //     const fetchNote = async () => {
  //       try {
  //         const response = await axios.get(`http://127.0.0.1:3000/api/nursing-clinical-notes-chart/${noteId}`);
  //         const note = response.data;
  //         const benefitPeriod = note.benefit_period;
  //         const patient = benefitPeriod.patient;

  //         setNoteData({
  //           note_date: note.note_date,
  //           // time_in: note.time_in,
  //           time_in: benefitPeriod.start_date,
  //           // time_out: note.time_out,
  //           time_out: benefitPeriod.end_date,
  //           patient_name: `${patient.last_name}, ${patient.first_name}`,
  //           patient_number: patient.patient_number,
  //           location_name: note.location_name,
  //           benefit_period: benefitPeriod.period_number,
  //           dob: patient.dob,
  //           location_number: note.location_number,
  //           prn_visit: note.prn_visit,
  //           benefit_period_dates: `From ${benefitPeriod.start_date} To ${benefitPeriod.end_date}`,
  //           patient_identifiers: note.patient_identifiers
  //         });
  //       } catch (error) {
  //         console.error('Error fetching nursing clinical note:', error);
  //       }
  //     };

  //     fetchNote();
  //   }
  // }, [noteId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setNoteData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    try {
      await http.put(`/nursing-clinical-notes/nursing-clinical-notes/${noteId}`, noteData);
      router.push(`/patients/nursing-clinical-note/${noteId}`);
    } catch (error) {
      console.error('Error updating nursing clinical note:', error);
    }
  };

  const handleClick = () => {
    setOpen(!open);
  };

  const handleGeneratePdf = async () => {
    try {
      const response = await http.get(`/generate-pdf/${noteId}`, {
        responseType: 'blob'
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'output.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  

  //vital signs

  const [vitalSigns, setVitalSigns] = useState({
    degrees_fahrenheit: '',
    temperature_method: '',
    heart_rate: '',
    heart_rhythm: '',
    heart_rate_location: '',
    other_heart_rate_location: '',
    bp_mmhg: '',
    bp_position: '',
    bp_location: '',
    other_bp_location: '',
    bp_additional_readings: '',
    respiratory_rate: '',
    respiratory_rhythm: '',
    pulse_oximetry_percentage: '',
    pulse_ox_location: '',
    pulse_ox_other_location: '',
    body_height_inches: '',
    body_weight_ibs: '',
    body_weight_kg: '',
    body_weight_period: '',
    bmi_kg_m2: '',
    bmi_percentage: '',
  });

  // const handleChange = (e) => {
  //   const { name, value } = e.target;
  //   setVitalSigns({ ...vitalSigns, [name]: value });

  //   // Auto-save the changed field
  //   axios.post(`http://127.0.0.1:3000/api/vital_signs/${noteId}`, { [name]: value })
  //     .then(response => {
  //       console.log('Data saved:', response.data);
  //     })
  //     .catch(error => {
  //       console.error('Error saving data:', error);
  //     });
  // };

  useEffect(() => {
    // Load data from API
    http.get(`/vital-signs/vital-signs/${noteId}`)
      .then(response => {
        setVitalSigns(response.data);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, [noteId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedData = { ...vitalSigns, [name]: value };

    setVitalSigns(updatedData);

    // Auto-save the changed field
    http.post(`/vital-signs/vital-signs/${noteId}`, updatedData)
      .then(response => {
        console.log('Data saved:', response.data);
      })
      .catch(error => {
        console.error('Error saving data:', error);
      });
  };

  const [scalesToolsLabData, setScalesToolsLabData] = useState({
    mac: '',
    mtc: '',
    sleep_time: '',
    fast: '',
    nyha: '',
    other_reading_1: '',
    blood_sugar: '',
    pt_inr: '',
    other_reading_2: '',
    other_reading_3: '',
    other_reading_4: '',
  });

  useEffect(() => {
    // Load data from API
    http.get(`/nursing-clinical-notes/scales_tools_lab_data/${noteId}`)
      .then(response => {
        setScalesToolsLabData(response.data);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, [noteId]);

  const handleScalesToolsLabDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedData = { ...scalesToolsLabData, [name]: value };

    setScalesToolsLabData(updatedData);

    // Auto-save the changed field
    http.post(`/nursing-clinical-notes/scales_tools_lab_data/${noteId}`, updatedData)
      .then(response => {
        console.log('Data saved:', response.data);
      })
      .catch(error => {
        console.error('Error saving data:', error);
      });
  };


  // const [painData, setPainData] = useState({
  //   pain_level_now: '',
  //   pain_right: '',
  //   pain_left: '',
  //   pain_acceptable_level: '',
  //   pain_rated_by: [],
  //   respiratory_rhythm: '',
  //   pain_observations: [],
  //   pain_duration: [],
  //   pain_frequency: [],
  //   pain_character: [],
  //   worsened_by: [],
  //   relieved_by: [],
  //   effects_on_function: [],
  //   current_pain_management: '',
  //   breakthrough_pain: [],
  //   additional_pain_information: '',
  // });

  

  


  const [painData, setPainData] = useState<PainDataState>(painDataInitialState);

  useEffect(() => {
    http.get(`/nursing-clinical-notes/pain_data/${noteId}`)
      .then(response => {
        const data = response.data;
        setPainData({
          pain_level_now: data.pain_level_now || '',
          pain_right: data.pain_right || '',
          pain_left: data.pain_left || '',
          pain_acceptable_level: data.pain_acceptable_level || '',
          pain_rated_by: data.pain_rated_by || [],
          respiratory_rhythm: data.respiratory_rhythm || '',
          pain_observations: data.pain_observations || [],
          pain_duration: data.pain_duration || [],
          pain_frequency: data.pain_frequency || [],
          pain_character: data.pain_character || [],
          worsened_by: data.worsened_by || [],
          relieved_by: data.relieved_by || [],
          effects_on_function: data.effects_on_function || [],
          current_pain_management: data.current_pain_management || '',
          breakthrough_pain: data.breakthrough_pain || [],
          additional_pain_information: data.additional_pain_information || '',
        });
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, [noteId]);

  const handleChangePainData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let updatedData = { ...painData };
  
    if (type === 'checkbox') {
      // const checkboxGroup = name.split('_')[0] as keyof PainDataState;
      const checkboxGroup = name as keyof PainDataState;
  
      // Temporarily using `any` to bypass the TypeScript error
      if (Array.isArray(updatedData[checkboxGroup])) {
        if (checked) {
          (updatedData[checkboxGroup] as any) = [...(updatedData[checkboxGroup] as any), value];
        } else {
          (updatedData[checkboxGroup] as any) = (updatedData[checkboxGroup] as any).filter((item: string) => item !== value);
        }
      }
    } else {
      updatedData = { ...painData, [name]: value };
    }
  
    setPainData(updatedData);
  
    http.post(`/nursing-clinical-notes/pain_data/${noteId}`, updatedData)
      .then(response => {
        console.log('Data saved:', response.data);
      })
      .catch(error => {
        console.error('Error saving data:', error);
      });
  };

  const [painadData, setPainadData] = useState<PainadDataState>(painadDataInitialState);

  useEffect(() => {
    http.get(`/nursing-clinical-notes/pain_data/${noteId}`)
      .then(response => {
        const data = response.data;
        const initialPainadData = {
          pain_assessment_behavior: data.pain_assessment_behavior || '',
          pain_assessment_negative_vocalizations: data.pain_assessment_negative_vocalizations || '',
          pain_assessment_facial_expression: data.pain_assessment_facial_expression || '',
          pain_assessment_body_language: data.pain_assessment_body_language || '',
          pain_consolability: data.pain_consolability || '',
          painad_total_score: 0,
        };
  
        // Calculer le score total
        const totalScore = (parseInt(initialPainadData.pain_assessment_behavior, 10) || 0) +
                           (parseInt(initialPainadData.pain_assessment_negative_vocalizations, 10) || 0) +
                           (parseInt(initialPainadData.pain_assessment_facial_expression, 10) || 0) +
                           (parseInt(initialPainadData.pain_assessment_body_language, 10) || 0) +
                           (parseInt(initialPainadData.pain_consolability, 10) || 0);
  
        initialPainadData.painad_total_score = totalScore;
  
        setPainadData(initialPainadData);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, [noteId]);
  

  const handleChangePainadData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let updatedData = { ...painadData };
  
    if (type === 'checkbox') {
      const checkboxGroup = name as keyof PainadDataState;
  
      if (Array.isArray(updatedData[checkboxGroup])) {
        if (checked) {
          (updatedData[checkboxGroup] as any) = [...(updatedData[checkboxGroup] as any), value];
        } else {
          (updatedData[checkboxGroup] as any) = (updatedData[checkboxGroup] as any).filter((item: string) => item !== value);
        }
      }
    } else {
      updatedData = { ...painadData, [name]: value };
    }
  
    // Calculer le score total
    const totalScore = (parseInt(updatedData.pain_assessment_behavior, 10) || 0) +
                     (parseInt(updatedData.pain_assessment_negative_vocalizations, 10) || 0) +
                     (parseInt(updatedData.pain_assessment_facial_expression, 10) || 0) +
                     (parseInt(updatedData.pain_assessment_body_language, 10) || 0) +
                     (parseInt(updatedData.pain_consolability, 10) || 0);
  
    updatedData = { ...updatedData, painad_total_score: totalScore };
  
    setPainadData(updatedData);
  
    http.post(`/nursing-clinical-notes/pain_data/${noteId}`, updatedData)
      .then(response => {
        console.log('Data saved:', response.data);
      })
      .catch(error => {
        console.error('Error saving data:', error);
      });
  };
  
  
  const initialFlaccData = {
    flacc_face: '',
    flacc_legs: '',
    flacc_activity: '',
    flacc_cry: '',
    flacc_consolability: '',
    total_score: 0,
  };
  
  
const [flaccData, setFlaccData] = useState(initialFlaccData);

useEffect(() => {
  http.get(`/nursing-clinical-notes/flacc_data/${noteId}`)
    .then(response => {
      const data = response.data;
      const initialFlaccData = {
        flacc_face: data.flacc_face || '',
        flacc_legs: data.flacc_legs || '',
        flacc_activity: data.flacc_activity || '',
        flacc_cry: data.flacc_cry || '',
        flacc_consolability: data.flacc_consolability || '',
        total_score: 0,
      };

      // Calculer le score total
      const totalScore = (parseInt(initialFlaccData.flacc_face, 10) || 0) +
                         (parseInt(initialFlaccData.flacc_legs, 10) || 0) +
                         (parseInt(initialFlaccData.flacc_activity, 10) || 0) +
                         (parseInt(initialFlaccData.flacc_cry, 10) || 0) +
                         (parseInt(initialFlaccData.flacc_consolability, 10) || 0);

      initialFlaccData.total_score = totalScore;

      setFlaccData(initialFlaccData);
    })
    .catch(error => {
      console.error('Error fetching data:', error);
    });
}, [noteId]);

const handleChangeFlaccData = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  let updatedData = { ...flaccData, [name]: value };

  // Calculer le score total
  const totalScore = (parseInt(updatedData.flacc_face, 10) || 0) +
                     (parseInt(updatedData.flacc_legs, 10) || 0) +
                     (parseInt(updatedData.flacc_activity, 10) || 0) +
                     (parseInt(updatedData.flacc_cry, 10) || 0) +
                     (parseInt(updatedData.flacc_consolability, 10) || 0);

  updatedData = { ...updatedData, total_score: totalScore };

  setFlaccData(updatedData);

  http.post(`/nursing-clinical-notes/flacc_data/${noteId}`, updatedData)
    .then(response => {
      console.log('Data saved:', response.data);
    })
    .catch(error => {
      console.error('Error saving data:', error);
    });
};


  const cardiovascularDataInitialState = {
    chest_pain: false,
    dizziness: false,
    edema: [] as string[],
    pedal: false,
    right: false,
    left: false,
    sacral: false,
    dependent: false,
    irregular_heart_sounds: false,
    neck_vein_distention: false,
    devices: [] as string[],
    additional_details: false,
    present: [] as string[],
    bounding: [] as string[],
    weak_thready: [] as string[],
    absent: [] as string[],
    cardiovascular_note: false,
    right_foot: '',
    left_foot: '',
    right_ankle: '',
    left_ankle: '',
    right_calf: '',
    left_calf: '',
    right_upper_leg: '',
    left_upper_leg: '',
    right_hand: '',
    left_hand: '',
    right_arm: '',
    left_arm: '',
    right_scrotum: '',
    left_scrotum: '',
    right_face: '',
    left_face: ''
  };

  type CardiovascularDataState = typeof cardiovascularDataInitialState;


  const [cardiovascularData, setCardiovascularData] = useState<CardiovascularDataState>(cardiovascularDataInitialState);

  useEffect(() => {
    http.get(`/nursing-clinical-notes/cardiovascular_data/${noteId}`)
      .then(response => {
        const data = response.data;
        setCardiovascularData({
          chest_pain: data.chest_pain || false,
          dizziness: data.dizziness || false,
          edema: data.edema || [],
          pedal: data.pedal || false,
          right: data.right || false,
          left: data.left || false,
          sacral: data.sacral || false,
          dependent: data.dependent || false,
          irregular_heart_sounds: data.irregular_heart_sounds || false,
          neck_vein_distention: data.neck_vein_distention || false,
          devices: data.devices || [],
          additional_details: data.additional_details || false,
          present: data.present || [],
          bounding: data.bounding || [],
          weak_thready: data.weak_thready || [],
          absent: data.absent || [],
          cardiovascular_note: data.cardiovascular_note || false,
          right_foot: data.right_foot || '',
          left_foot: data.left_foot || '',
          right_ankle: data.right_ankle || '',
          left_ankle: data.left_ankle || '',
          right_calf: data.right_calf || '',
          left_calf: data.left_calf || '',
          right_upper_leg: data.right_upper_leg || '',
          left_upper_leg: data.left_upper_leg || '',
          right_hand: data.right_hand || '',
          left_hand: data.left_hand || '',
          right_arm: data.right_arm || '',
          left_arm: data.left_arm || '',
          right_scrotum: data.right_scrotum || '',
          left_scrotum: data.left_scrotum || '',
          right_face: data.right_face || '',
          left_face: data.left_face || ''
        });
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, [noteId]);

  const handleChangeCardiovascularData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let updatedData = { ...cardiovascularData };

    if (type === 'checkbox') {
      const checkboxGroup = name as keyof CardiovascularDataState;

      if (Array.isArray(updatedData[checkboxGroup])) {
        if (checked) {
          (updatedData[checkboxGroup] as any) = [...(updatedData[checkboxGroup] as any), value];
        } else {
          (updatedData[checkboxGroup] as any) = (updatedData[checkboxGroup] as any).filter((item: string) => item !== value);
        }
      } else {
        updatedData = { ...cardiovascularData, [name]: checked };
      }
    } else {
      updatedData = { ...cardiovascularData, [name]: value };
    }

    setCardiovascularData(updatedData);

    http.post(`/nursing-clinical-notes/cardiovascular_data/${noteId}`, updatedData)
      .then(response => {
        console.log('Data saved:', response.data);
      })
      .catch(error => {
        console.error('Error saving data:', error);
      });
  };


  const respiratoryDataInitialState = {
    clear: [] as string[],
    diminished: [] as string[],
    crackles: [] as string[],
    rhonchi: [] as string[],
    wheezing: [] as string[],
    rales: [] as string[],
    absent: [] as string[],
    note: '',
    breathing: [] as string[],
    oxygen_use: [] as string[],
    shortness_of_breath: {
      level_now: '',
      worst_level: '',
      best_level: '',
      acceptable_level: '',
      walk_without_shortness: false,
    },
  };

  type RespiratoryDataState = typeof respiratoryDataInitialState;

  const [respiratoryData, setRespiratoryData] = useState<RespiratoryDataState>(respiratoryDataInitialState);

  useEffect(() => {
    http.get(`/nursing-clinical-notes/respiratory_data/${noteId}`)
      .then(response => {
        const data = response.data;
        setRespiratoryData({
          clear: data.clear || [],
          diminished: data.diminished || [],
          crackles: data.crackles || [],
          rhonchi: data.rhonchi || [],
          wheezing: data.wheezing || [],
          rales: data.rales || [],
          absent: data.absent || [],
          note: data.note || '',
          breathing: data.breathing || [],
          oxygen_use: data.oxygen_use || [],
          shortness_of_breath: {
            level_now: data.shortness_of_breath.level_now || '',
            worst_level: data.shortness_of_breath.worst_level || '',
            best_level: data.shortness_of_breath.best_level || '',
            acceptable_level: data.shortness_of_breath.acceptable_level || '',
            walk_without_shortness: data.shortness_of_breath.walk_without_shortness || false,
          },
        });
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, [noteId]);


  // const handleChangeRespiratoryData = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { name, value, type, checked } = e.target;
  //   let updatedData = { ...respiratoryData };

  //   if (type === 'checkbox') {
  //     const checkboxGroup = name.split('_')[0] as keyof RespiratoryDataState;
  //     if (Array.isArray(updatedData[checkboxGroup])) {
  //       if (checked) {
  //         (updatedData[checkboxGroup] as any) = [...(updatedData[checkboxGroup] as any), value];
  //       } else {
  //         (updatedData[checkboxGroup] as any) = (updatedData[checkboxGroup] as any).filter((item: string) => item !== value);
  //       }
  //     } else {
  //       updatedData.shortness_of_breath = { ...updatedData.shortness_of_breath, [name]: checked };
  //     }
  //   } else {
  //     if (name in updatedData.shortness_of_breath) {
  //       updatedData.shortness_of_breath = { ...updatedData.shortness_of_breath, [name]: value };
  //     } else {
  //       updatedData = { ...respiratoryData, [name]: value };
  //     }
  //   }

  //   setRespiratoryData(updatedData);

  //   axios.post(`http://127.0.0.1:3000/api/nursing-clinical-notes/respiratory_data/${noteId}`, updatedData)
  //     .then(response => {
  //       console.log('Data saved:', response.data);
  //     })
  //     .catch(error => {
  //       console.error('Error saving data:', error);
  //     });
  // };

  const handleChangeRespiratoryData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let updatedData = { ...respiratoryData };
  
    if (type === 'checkbox') {
      if (Array.isArray(updatedData[name as keyof RespiratoryDataState])) {
        if (checked) {
          (updatedData[name as keyof RespiratoryDataState] as string[]) = [
            ...(updatedData[name as keyof RespiratoryDataState] as string[]),
            value,
          ];
        } else {
          (updatedData[name as keyof RespiratoryDataState] as string[]) = (updatedData[name as keyof RespiratoryDataState] as string[]).filter(
            (item: string) => item !== value
          );
        }
      } else {
        (updatedData[name as keyof RespiratoryDataState] as unknown) = checked;
      }
    } else {
      if (name in updatedData.shortness_of_breath) {
        updatedData.shortness_of_breath = { ...updatedData.shortness_of_breath, [name]: value };
      } else {
        updatedData = { ...respiratoryData, [name]: value };
      }
    }
  
    setRespiratoryData(updatedData);
  
    http
      .post(`/nursing-clinical-notes/respiratory_data/${noteId}`, updatedData)
      .then(response => {
        console.log('Data saved:', response.data);
      })
      .catch(error => {
        console.error('Error saving data:', error);
      });
  };
  

  const genitourinaryDataInitialState = {
    absence_urinary_output: false,
    decrease_urinary_output: false,
    change_bladder_incontinence: false,
    distension: false,
    incontinence: false,
    retention: false,
    current_ss_infection: {
      burning: false,
      hematuria: false,
      fever: false,
      spasms: false,
      foul_smelling_urine: false,
      cloudy_urine: false,
      other: false,
    },
    indwelling_catheter_flush: false,
    other_catheter: false,
    no_deficit: false,
    urinary_diversion_ostomy_ileal_conduit: false,
    urinary_diversion_ostomy_nephrostomy: false,
    urinary_diversion_ostomy_ureterostomy: false,
    urinary_diversion_ostomy_other: false,
    urinary_diversion_ostomy_suprapubic_catheter: false,
    urinary_diversion_ostomy_condom_catheter: false,
    flush: '',
    size_balloon: '',
    describe_deficits: '',
  };
  
  type GenitourinaryDataState = typeof genitourinaryDataInitialState;
  

  const [genitourinaryData, setGenitourinaryData] = useState<GenitourinaryDataState>(genitourinaryDataInitialState);
  useEffect(() => {
    // Use store data if available, otherwise fetch
    if (selectedPatientData && selectedPatientId) {
      console.log('Using patient data from store:', selectedPatientData);
      setPatientData(selectedPatientData);
    } else if (selectedPatientId) {
      fetchPatientData(selectedPatientId);
    } else if (id) {
      fetchPatientData(id);
    }
  }, [id, selectedPatientId, selectedPatientData]);
  useEffect(() => {
    http.get(`/nursing-clinical-notes/genitourinary_data/${noteId}`)
      .then(response => {
        const data = response.data;
        setGenitourinaryData({
          absence_urinary_output: data.absence_urinary_output || false,
          decrease_urinary_output: data.decrease_urinary_output || false,
          change_bladder_incontinence: data.change_bladder_incontinence || false,
          distension: data.distension || false,
          incontinence: data.incontinence || false,
          retention: data.retention || false,
          current_ss_infection: {
            burning: data.current_ss_infection?.burning || false,
            hematuria: data.current_ss_infection?.hematuria || false,
            fever: data.current_ss_infection?.fever || false,
            spasms: data.current_ss_infection?.spasms || false,
            foul_smelling_urine: data.current_ss_infection?.foul_smelling_urine || false,
            cloudy_urine: data.current_ss_infection?.cloudy_urine || false,
            other: data.current_ss_infection?.other || false,
          },
          indwelling_catheter_flush: data.indwelling_catheter_flush || false,
          other_catheter: data.other_catheter || false,
          no_deficit: data.no_deficit || false,
          urinary_diversion_ostomy_ileal_conduit: data.urinary_diversion_ostomy_ileal_conduit || false,
          urinary_diversion_ostomy_nephrostomy: data.urinary_diversion_ostomy_nephrostomy || false,
          urinary_diversion_ostomy_ureterostomy: data.urinary_diversion_ostomy_ureterostomy || false,
          urinary_diversion_ostomy_other: data.urinary_diversion_ostomy_other || false,
          urinary_diversion_ostomy_suprapubic_catheter: data.urinary_diversion_ostomy_suprapubic_catheter || false,
          urinary_diversion_ostomy_condom_catheter: data.urinary_diversion_ostomy_condom_catheter || false,
          flush: data.flush || '',
          size_balloon: data.size_balloon || '',
          describe_deficits: data.describe_deficits || '',
        });
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, [noteId]);

  const handleChangeGenitourinaryData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    let updatedData = { ...genitourinaryData };

    if (type === 'checkbox') {
      const [parent, child] = name.split('.') as [keyof GenitourinaryDataState, string];
      if (child) {
        updatedData = {
          ...updatedData,
          [parent as keyof GenitourinaryDataState]: {
            ...(updatedData[parent as keyof GenitourinaryDataState] as any),
            [child]: checked,
          },
        };
      } else {
        updatedData = { ...updatedData, [name]: checked };
      }
    } else {
      updatedData = { ...genitourinaryData, [name]: value };
    }

    setGenitourinaryData(updatedData);

    http.post(`/nursing-clinical-notes/genitourinary_data/${noteId}`, updatedData)
      .then(response => {
        console.log('Data saved:', response.data);
      })
      .catch(error => {
        console.error('Error saving data:', error);
      });
  };


  const gastrointestinalDataInitialState = {
    last_bm: false,
    unknown: false,
    bowel_sounds: false,
    present: { ruq: false, rlq: false, luq: false, llq: false },
    hyper_active: { ruq: false, rlq: false, luq: false, llq: false },
    hypo_active: { ruq: false, rlq: false, luq: false, llq: false },
    absent: { ruq: false, rlq: false, luq: false, llq: false },
    rectal_bleeding: false,
    hemorrhoids: false,
    bowel_incontinence: false,
    change_bowel_incontinence: false,
    constipation: false,
    diarrhea: false,
    ascites: false,
    ostomy_details: false,
    drain_details: false,
    anorexia: false,
    cachexia: false,
    nausea: false,
    vomiting: false,
    no_intake_last_24hrs: false,
    swallowing_deficits: false,
    inability_swallow: false,
    diet: '',
    percentage_eaten: '',
    npo: false,
    tube_feeding: false,
    placement_checked: false,
    most_recent_rbs: false,
    hyperglycemia: false,
    hypoglycemia: false,
    other: false,
    no_deficit: false,
    describe_deficits: '',
  };
  
  type GastrointestinalDataState = typeof gastrointestinalDataInitialState;
  
  const [gastrointestinalData, setGastrointestinalData] = useState<GastrointestinalDataState>(gastrointestinalDataInitialState);
  
  useEffect(() => {
    http.get(`/nursing-clinical-notes/gastrointestinal_data/${noteId}`)
      .then(response => {
        const data = response.data;
        setGastrointestinalData({
          last_bm: data.last_bm || false,
          unknown: data.unknown || false,
          bowel_sounds: data.bowel_sounds || false,
          present: data.present || { ruq: false, rlq: false, luq: false, llq: false },
          hyper_active: data.hyper_active || { ruq: false, rlq: false, luq: false, llq: false },
          hypo_active: data.hypo_active || { ruq: false, rlq: false, luq: false, llq: false },
          absent: data.absent || { ruq: false, rlq: false, luq: false, llq: false },
          rectal_bleeding: data.rectal_bleeding || false,
          hemorrhoids: data.hemorrhoids || false,
          bowel_incontinence: data.bowel_incontinence || false,
          change_bowel_incontinence: data.change_bowel_incontinence || false,
          constipation: data.constipation || false,
          diarrhea: data.diarrhea || false,
          ascites: data.ascites || false,
          ostomy_details: data.ostomy_details || false,
          drain_details: data.drain_details || false,
          anorexia: data.anorexia || false,
          cachexia: data.cachexia || false,
          nausea: data.nausea || false,
          vomiting: data.vomiting || false,
          no_intake_last_24hrs: data.no_intake_last_24hrs || false,
          swallowing_deficits: data.swallowing_deficits || false,
          inability_swallow: data.inability_swallow || false,
          diet: data.diet || '',
          percentage_eaten: data.percentage_eaten || '',
          npo: data.npo || false,
          tube_feeding: data.tube_feeding || false,
          placement_checked: data.placement_checked || false,
          most_recent_rbs: data.most_recent_rbs || false,
          hyperglycemia: data.hyperglycemia || false,
          hypoglycemia: data.hypoglycemia || false,
          other: data.other || false,
          no_deficit: data.no_deficit || false,
          describe_deficits: data.describe_deficits || '',
        });
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, [noteId]);
  
  // const handleChangeGastrointestinalData = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { name, value, type, checked } = e.target;
  //   let updatedData = { ...gastrointestinalData };
  
  //   if (type === 'checkbox') {
  //     const checkboxGroup = name as keyof GastrointestinalDataState;
  
  //     if (Array.isArray(updatedData[checkboxGroup])) {
  //       if (checked) {
  //         (updatedData[checkboxGroup] as any) = [...(updatedData[checkboxGroup] as any), value];
  //       } else {
  //         (updatedData[checkboxGroup] as any) = (updatedData[checkboxGroup] as any).filter((item: string) => item !== value);
  //       }
  //     } else {
  //       (updatedData[checkboxGroup] as any) = checked;
  //     }
  //   } else {
  //     updatedData = { ...gastrointestinalData, [name]: value };
  //   }
  
  //   setGastrointestinalData(updatedData);
  
  //   axios.post(`http://127.0.0.1:3000/api/nursing-clinical-notes/gastrointestinal_data/${noteId}`, updatedData)
  //     .then(response => {
  //       console.log('Data saved:', response.data);
  //     })
  //     .catch(error => {
  //       console.error('Error saving data:', error);
  //     });
  // };
  const handleChangeGastrointestinalData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target;
    const nameParts = name.split('.');
    
    let updatedData = { ...gastrointestinalData };
  
    if (type === 'checkbox') {
      // Check if it's a nested property (e.g., "present.ruq")
      if (nameParts.length === 2) {
        const [group, key] = nameParts;
        // Ensure the group exists and is an object
        if (typeof updatedData[group as keyof GastrointestinalDataState] === 'object' && 
            updatedData[group as keyof GastrointestinalDataState] !== null &&
            !Array.isArray(updatedData[group as keyof GastrointestinalDataState])) {
          updatedData = {
            ...updatedData,
            [group]: {
              ...(updatedData[group as keyof GastrointestinalDataState] as any),
              [key]: checked
            }
          };
        }
      } else {
        // Direct boolean property (e.g., "last_bm")
        updatedData = { ...updatedData, [name]: checked };
      }
    } else {
      // Text input
      updatedData = { ...updatedData, [name]: value };
    }
  
    setGastrointestinalData(updatedData);
  
    http.post(`/nursing-clinical-notes/gastrointestinal_data/${noteId}`, updatedData)
      .then(response => {
        console.log('Data saved:', response.data);
      })
      .catch(error => {
        console.error('Error saving data:', error);
      });
  };
  
  const handleBackToChart = () => {
    // Try to navigate back; fallback to patient chart if patient id is available
    const patientIdFromNote = (noteData as any)?.benefit_period?.patient?.id;
    if (patientIdFromNote) {
      router.push(`/patients/patient_chart/${patientIdFromNote}`);
    } else {
      router.back();
    }
  };

  return (
    <>

  <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
    <Button variant="outlined" color="secondary" onClick={handleBackToChart}>
      Back to Patient Charts
    </Button>
  </Stack>

  <MainCard
        border={true}
        content={true}
        sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'light.700' : 'light.lighter', position: 'relative',my:3 }}
        
      >
        <Grid container justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 5 }}>
          <Grid item>
            <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
              <Stack spacing={2.5} alignItems="center">
                <Avatar alt="Avatar 1" size="xl" src={`${avatarImage}/avatar-6.png`} />
              </Stack>
              <Stack spacing={0.75}>
                <Typography variant="h5">{patientData.first_name}</Typography>
                <Typography variant="body2" color="secondary">
                  DOB: {patientData.date_of_birth}
                </Typography>
                <Typography variant="body2" color="secondary">
                  Dx Complete your profile to unlock all features
                </Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid item>
            <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
              <Stack spacing={0.75}>
                <Typography variant="body1" color="secondary">
                  Status: Admitted
                </Typography>
                <Typography variant="body2" color="secondary">
                  ReCert: Complete your profile to unlock all features
                </Typography>
                <Typography variant="body2" color="secondary">
                  Dx Complete your profile to unlock all features
                </Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid item sx={{ mx: matchDownSM ? 2 : 3, my: matchDownSM ? 1 : 0, mb: matchDownSM ? 2 : 0 }} xs={matchDownSM ? 12 : 'auto'}>
          
      <Button onClick={handleClick} variant="outlined"  sx={{ border: '1px solid #fafafa', borderRadius: '5px' }}>
        {open ? 'collapse' : 'Expand'}
      </Button>
            
          </Grid>
        </Grid>
        <Grid>
    <Collapse in={open}>
        <Typography>
        <Grid container justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 5 }}>
          <Grid item>
            <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
              <Stack spacing={0.75}>
                <Typography variant="body2" color="secondary">
                  DOB: 10/12/1942
                </Typography>
                <Typography variant="body2" color="secondary">
                Allergy to aller tesr - tttg.
                Adverse reaction to Allergy D-12(obsolete) - hhhhh.
                </Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid item>
            <Stack direction="row" spacing={matchDownSM ? 1 : 2} alignItems="center">
              <Stack spacing={0.75}>
                <Typography variant="body1" color="secondary">
                  Status: Admitted
                </Typography>
                <Typography variant="body2" color="secondary">
                  ReCert: Complete your profile to unlock all features
                </Typography>
                <Typography variant="body2" color="secondary">
                  Dx Complete your profile to unlock all features
                </Typography>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
        </Typography>
      </Collapse>
    </Grid>
      </MainCard >
      
    <MainCard 
    border={false} 
    content={false}
    ref={componentRef}
     sx={{ mt: 5}} 

    >
      
      <Grid container spacing={3}>
      
        <Grid item xs={12}>
       
          <div
            style={{
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              minHeight: '420px',
              // backgroundColor:'red'
            }}
          >
            
            <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12}>
                <Button variant="contained" color="primary" onClick={handleGeneratePdf}>
                  Download PDF
                </Button>
                <Typography variant="h4" color="secondary">
                  Chart: 1 Benefit Period: {noteData.benefit_period?.period_number || ''} Level of Care Routine Home Care 10/05/2024
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1.25}>
                  <Typography variant="body1" color="secondary">
                    Time In:
                  </Typography>
                  <TextField id="time_in" name="time_in" type="time" value={noteData.time_in} onChange={handleChangeNoteData} />
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack spacing={1.25}>
                  <Typography variant="body1" color="secondary">
                    Time Out:
                  </Typography>
                  <TextField id="time_out" name="time_out" type="time" value={noteData.time_out} onChange={handleChangeNoteData} />
                </Stack>
              </Grid>
              <Grid item md={6} xs={12}>
                <Stack direction="row" alignItems="center">
                  <Stack spacing={2.5} alignItems="center"></Stack>
                  <Stack spacing={0.75}>
                    <Typography variant="h5" color="secondary">
                      Patient Name: {patientData.last_name} {patientData.first_name}
                    </Typography>
                    <Typography variant="h5" color="secondary">
                      Patient Number: {noteData.patient_number}
                    </Typography>
                    <Typography variant="h5" color="secondary">
                      Location Name: {noteData.location_name}
                    </Typography>
                    <Typography variant="h5" color="secondary">
                      Benefit Period: {noteData.benefit_period?.start_date} to {noteData.benefit_period?.end_date}
                    </Typography>
                  </Stack>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack direction="row" alignItems="center">
                  <Stack spacing={0.75}>
                    <Typography variant="h5" color="secondary">
                      DOB: 
                    </Typography>
                    <Typography variant="h5" color="secondary">
                      Location Number: {noteData.location_number}
                    </Typography>
                    <Grid>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="PRN Visit (Specify):"
                      sx={{ m: 0, p: 0 }}
                      id="prn_visit"
                      name="prn_visit"
                      onChange={(e: any) => handleChangeNoteData(e)}
                      checked={noteData.prn_visit}
                    />
                    </Grid>
                    <Typography variant="h5" color="secondary">
                      Benefit Period Dates: From {noteData.benefit_period?.start_date} To {noteData.benefit_period?.end_date}
                    </Typography>
                  </Stack>
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h4" sx={{ my: 1 }}>
                  Two (or more) patient identifiers used this visit:
                </Typography>
                <Grid container item xs={12} spacing={2}>
                  {['Assigned identification number (for example, MBI, SSN)', 'Insurance card', 'Passport', 'Other patient identifier(s) used this visit:'].map((label, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <FormControlLabel
                        control={<Checkbox name="patient_identifiers" value={label} checked={noteData.patient_identifiers.includes(label)} onChange={handleChangeNoteData} />}
                        label={label}
                      />
                    </Grid>
                  ))}
                  {['Direct facial recognition (known to staff)', 'Patient address confirmed', 'Social Security Card', 'Driver\'s license', 'Patient Name', 'Unknown or not assessed'].map((label, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <FormControlLabel
                        control={<Checkbox name="patient_identifiers" value={label} checked={noteData.patient_identifiers.includes(label)} onChange={handleChangeNoteData} />}
                        label={label}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
            
          </div>
        </Grid>



        <Grid item xs={12}>
          <div
            style={{
              borderLeft: '5px solid #189AAC',
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              minHeight: '420px'
            }}
          >
            <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
              <h2>VITAL SIGNS </h2>
            </div>
            <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12}>
                <Stack spacing={1.25}>
                  <Typography variant="h4">Body Temperature / Route</Typography>
                  <Typography variant="body1" color="secondary">Degrees fahrenheit</Typography>
                  <TextField id="degrees_fahrenheit" type="number" name="degrees_fahrenheit" value={vitalSigns.degrees_fahrenheit} onChange={handleChange} />

                  <Typography variant="body1" color="secondary">Temperature Method:</Typography>
                  <TextField id="temperature_method" type="text" name="temperature_method" value={vitalSigns.temperature_method} onChange={handleChange} />
                </Stack>

                <Stack spacing={1.25}>
                  <Typography variant="h4">Heart Rate:</Typography>
                  <Typography variant="body1" color="secondary">beats / minute</Typography>
                  <TextField id="beats_minutes" type="number" name="heart_rate" value={vitalSigns.heart_rate} onChange={handleChange} />

                  <FormControl component="fieldset">
                    <RadioGroup aria-label="heart_rhythm" name="heart_rhythm" value={vitalSigns.heart_rhythm} onChange={handleChange}>
                      <Grid container>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body1" color="secondary">Heart Rhythm :</Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <FormControlLabel value="regular" control={<Radio />} label="Regular" id="heart_rhythm_regular" />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <FormControlLabel value="irregular" control={<Radio />} label="Irregular" id="heart_rhythm_irregular" />
                        </Grid>
                      </Grid>
                    </RadioGroup>
                  </FormControl>

                  <FormControl component="fieldset">
                    <RadioGroup aria-label="heart_rate_location" name="heart_rate_location" value={vitalSigns.heart_rate_location} onChange={handleChange}>
                      <Grid container>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body1" color="secondary">
                            Heart Rate Location :
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControlLabel value="apical" control={<Radio />} label="Apical" id="heart_rate_location_apical" />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControlLabel value="radial" control={<Radio />} label="Radial" id="heart_rate_location_radial" />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControlLabel value="other" control={<Radio />} label="Other" id="heart_rate_location_other" />
                        </Grid>
                      </Grid>
                    </RadioGroup>
                  </FormControl>

                  {vitalSigns.heart_rate_location === 'other' && (
                    <>
                      <Typography variant="body1" color="secondary">Other Heart Rate Location :</Typography>
                      <TextField id="other_heart_rate_location" type="text" name="other_heart_rate_location" value={vitalSigns.other_heart_rate_location} onChange={handleChange} />
                    </>
                  )}
                </Stack>

                <Stack spacing={1.25}>
                  <Typography variant="h4">Blood Pressure - Systolic / Diastolic:</Typography>
                  <Typography variant="body1" color="secondary">mmHg</Typography>
                  <TextField id="bp_mmhg" type="number" name="bp_mmhg" value={vitalSigns.bp_mmhg} onChange={handleChange} />

                  <Typography variant="body1" color="secondary"> Position :</Typography>
                  <TextField id="bp_position" type="text" name="bp_position" value={vitalSigns.bp_position} onChange={handleChange} />

                  <FormControl component="fieldset">
                    <RadioGroup aria-label="bp_location" name="bp_location" value={vitalSigns.bp_location} onChange={handleChange}>
                      <Grid container>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body1" color="secondary">BP Location :</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControlLabel value="L Arm" control={<Radio />} label="L Arm" id="bp_location_l_arm" />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControlLabel value="R Arm" control={<Radio />} label="R Arm" id="bp_location_r_arm" />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControlLabel value="Other" control={<Radio />} label="Other" id="bp_location_other" />
                        </Grid>
                      </Grid>
                    </RadioGroup>
                  </FormControl>

                  {vitalSigns.bp_location === 'Other' && (
                    <>
                      <Typography variant="body1" color="secondary">Other BP Location : </Typography>
                      <TextField id="other_bp_location" name="other_bp_location" type="text" value={vitalSigns.other_bp_location} onChange={handleChange} />
                    </>
                  )}

                  <Typography variant="body1" color="secondary">Additional Readings / Details :</Typography>
                  <TextField id="bp_additional_readings" name="bp_additional_readings" type="text" value={vitalSigns.bp_additional_readings} onChange={handleChange} />
                </Stack>

                <Stack spacing={1.25}>
                  <Typography variant="h4">Respiratoty Rate:</Typography>
                  <Typography variant="body1" color="secondary">breaths / minute</Typography>
                  <TextField id="respiratory_rate" name="respiratory_rate" type="number" value={vitalSigns.respiratory_rate} onChange={handleChange} />
                  
                  <FormControl component="fieldset">
                    <RadioGroup aria-label="respiratory_rhythm" name="respiratory_rhythm" value={vitalSigns.respiratory_rhythm} onChange={handleChange}>
                      <Grid container>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body1" color="secondary">Respiratory Rhythm :</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControlLabel value="regular" control={<Radio />} label="Regular" id="respiratory_rhythm_regular" />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControlLabel value="irregular" control={<Radio />} label="Irregular" id="respiratory_rhythm_irregular" />
                        </Grid>
                      </Grid>
                    </RadioGroup>
                  </FormControl>
                </Stack>

                <Stack spacing={1.25}>
                  <Typography variant="h4">Pulse Oximetry :</Typography>
                  <Typography variant="body1" color="secondary">%</Typography>
                  <TextField id="pulse_oximetry_percentage" name="pulse_oximetry_percentage" type="number" value={vitalSigns.pulse_oximetry_percentage} onChange={handleChange} />

                  <Typography variant="body1" color="secondary">Pulse Ox Location :</Typography>
                  <TextField id="pulse_ox_location" name="pulse_ox_location" type="text" value={vitalSigns.pulse_ox_location} onChange={handleChange} />
                  
                  <Typography variant="body1" color="secondary">Other Location :</Typography>
                  <TextField id="pulse_ox_other_location" name="pulse_ox_other_location" type="text" value={vitalSigns.pulse_ox_other_location} onChange={handleChange} />
                </Stack>

                <Stack spacing={1.25}>
                  <Typography variant="h4">Body Height :</Typography>
                  <Typography variant="body1" color="secondary">inches</Typography>
                  <TextField id="body_height_inches" name="body_height_inches" type="number" value={vitalSigns.body_height_inches} onChange={handleChange} />
                </Stack>

                <Stack spacing={1.25}>
                  <Typography variant="h4">Body Weight:</Typography>
                  <Typography variant="body1" color="secondary">Ibs</Typography>
                  <TextField id="body_weight_ibs" name="body_weight_ibs" type="number" value={vitalSigns.body_weight_ibs} onChange={handleChange} />

                  <Typography variant="body1" color="secondary">Kg</Typography>
                  <TextField id="body_weight_kg" name="body_weight_kg" type="number" value={vitalSigns.body_weight_kg} onChange={handleChange} />
                  
                  <FormControl component="fieldset">
                    <RadioGroup aria-label="body_weight_period" name="body_weight_period" value={vitalSigns.body_weight_period} onChange={handleChange}>
                      <Grid container>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel value="actual" control={<Radio />} label="Actual" id="body_weight_actual" />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControlLabel value="reported" control={<Radio />} label="Reported" id="body_weight_reported" />
                        </Grid>
                      </Grid>
                    </RadioGroup>
                  </FormControl>
                </Stack>

                <Stack spacing={1.25}>
                  <Typography variant="h4">BMI:</Typography>
                  <Typography variant="body1" color="secondary">KG / m2</Typography>
                  <TextField id="bmi_kg_m2" name="bmi_kg_m2" type="number" value={vitalSigns.bmi_kg_m2} onChange={handleChange} />
                </Stack>

                <Stack spacing={1.25}>
                  <Typography variant="h4">BMI percentage:</Typography>
                  <Typography variant="body1"  color="secondary">% </Typography>
                  <TextField id="bmi_percentage" name="bmi_percentage" type="number" value={vitalSigns.bmi_percentage} onChange={handleChange} />
                </Stack>
              </Grid>
            </Grid>
          </div>
        </Grid>
        <Grid item xs={12}>
          <div
            style={{
              borderLeft: '5px solid #189AAC',
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              minHeight: '420px'
            }}
          >
            <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
              <h2>SCALES TOOLS & LAB DATA REVIEW</h2>
            </div>
            
            <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12}>
                <Stack spacing={1.25}>
                  <Typography variant="h4">Scales & Tools And Value / Reading THIS VISIT</Typography>
                  <Typography variant="body1" color="secondary">Mid-Arm Circumference (MAC) (includ unit of measure /location on arm):</Typography>
                  <TextField id="mac" name="mac" type="text" value={scalesToolsLabData.mac} onChange={handleScalesToolsLabDataChange} />
                </Stack>
                <Stack spacing={1.25}>
                  <Typography variant="body1" color="secondary">Mid-Thigh Circumference (MTC) (includ unit of measure /location on thigh):</Typography>
                  <TextField id="mtc" name="mtc" type="text" value={scalesToolsLabData.mtc} onChange={handleScalesToolsLabDataChange} />
                </Stack>
                <Stack spacing={1.25}>
                  <Typography variant="body1" color="secondary">SLEEP (time in last 24 hours):</Typography>
                  <TextField id="sleep_time" name="sleep_time" type="text" value={scalesToolsLabData.sleep_time} onChange={handleScalesToolsLabDataChange} />
                </Stack>
                <Stack spacing={1.25}>
                  <Typography variant="body1" color="secondary">FAST:</Typography>
                  <TextField id="fast" name="fast" type="text" value={scalesToolsLabData.fast} onChange={handleScalesToolsLabDataChange} />
                </Stack>
                <Stack spacing={1.25}>
                  <Typography variant="body1" color="secondary">NYHA:</Typography>
                  <TextField id="nyha" name="nyha" type="text" value={scalesToolsLabData.nyha} onChange={handleScalesToolsLabDataChange} />
                </Stack>
                <Stack spacing={1.25}>
                  <Typography variant="body1" color="secondary">Other Reading 1:</Typography>
                  <TextField id="other_reading_1" name="other_reading_1" type="text" value={scalesToolsLabData.other_reading_1} onChange={handleScalesToolsLabDataChange} />
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Stack spacing={1.25}>
                  <Typography variant="h4">Lab (POC or Other ) And Value / Reading THIS VISIT</Typography>
                  <Typography variant="body1" color="secondary">Blood Sugar:</Typography>
                  <TextField id="blood_sugar" name="blood_sugar" type="text" value={scalesToolsLabData.blood_sugar} onChange={handleScalesToolsLabDataChange} />
                </Stack>
                <Stack spacing={1.25}>
                  <Typography variant="body1" color="secondary">PT / INR:</Typography>
                  <TextField id="pt_inr" name="pt_inr" type="text" value={scalesToolsLabData.pt_inr} onChange={handleScalesToolsLabDataChange} />
                </Stack>
                <Stack spacing={1.25}>
                  <Typography variant="body1" color="secondary">Other Reading 2:</Typography>
                  <TextField id="other_reading_2" name="other_reading_2" type="text" value={scalesToolsLabData.other_reading_2} onChange={handleScalesToolsLabDataChange} />
                </Stack>
                <Stack spacing={1.25}>
                  <Typography variant="body1" color="secondary">Other Reading 3:</Typography>
                  <TextField id="other_reading_3" name="other_reading_3" type="text" value={scalesToolsLabData.other_reading_3} onChange={handleScalesToolsLabDataChange} />
                </Stack>
                <Stack spacing={1.25}>
                  <Typography variant="body1" color="secondary">Other Reading 4:</Typography>
                  <TextField id="other_reading_4" name="other_reading_4" type="text" value={scalesToolsLabData.other_reading_4} onChange={handleScalesToolsLabDataChange} />
                </Stack>
              </Grid>
            </Grid>
            
          </div>
        </Grid>
        <Grid item xs={12}>
          <div
            style={{
              borderLeft: '5px solid #189AAC',
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              minHeight: '420px'
            }}
          >
            <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
              <h2>*PAIN</h2>
            </div>
            
            <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12}>
                <Grid container spacing={3} sx={{ p: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Pain level now:</Typography>
                      <TextField id="pain_level_now" name="pain_level_now" type="text" value={painData.pain_level_now} onChange={handleChangePainData} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Right:</Typography>
                      <TextField id="pain_right" name="pain_right" type="text" value={painData.pain_right} onChange={handleChangePainData} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Left</Typography>
                      <TextField id="pain_left" name="pain_left" type="text" value={painData.pain_left} onChange={handleChangePainData} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Acceptable level of pain:</Typography>
                      <TextField id="pain_acceptable_level" name="pain_acceptable_level" type="text" value={painData.pain_acceptable_level} onChange={handleChangePainData} />
                    </Stack>
                  </Grid>
                </Grid>

                <Grid container spacing={3} sx={{ p: 1 }}>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Pain rated by:</Typography>
                    <FormGroup row sx={{ justifyContent: 'space-between' }}>
                      <FormControlLabel control={<Checkbox name="pain_rated_by" value="Patient" checked={painData.pain_rated_by.includes('Patient')} onChange={handleChangePainData} />} label="Patient" />
                      <FormControlLabel control={<Checkbox name="pain_rated_by" value="Caregiver" checked={painData.pain_rated_by.includes('Caregiver')} onChange={handleChangePainData} />} label="Caregiver" />
                      <FormControlLabel control={<Checkbox name="pain_rated_by" value="Hospice Nurse" checked={painData.pain_rated_by.includes('Hospice Nurse')} onChange={handleChangePainData} />} label="Hospice Nurse" />
                    </FormGroup>
                  </Grid>

                  <Grid item>
                    <Typography variant="body1" color="secondary">Respiratory Rhythm:</Typography>
                    <Grid container spacing={3}>
                      <Grid item>
                        <FormControlLabel control={<Radio name="respiratory_rhythm" value="Numeric i.e ESAS" checked={painData.respiratory_rhythm === 'Numeric i.e ESAS'} onChange={handleChangePainData} />} label="Numeric i.e ESAS" />
                      </Grid>
                      <Grid item>
                        <FormControlLabel control={<Radio name="respiratory_rhythm" value="Verbal descriptor" checked={painData.respiratory_rhythm === 'Verbal descriptor'} onChange={handleChangePainData} />} label="Verbal descriptor" />
                      </Grid>
                      <Grid item>
                        <FormControlLabel control={<Radio name="respiratory_rhythm" value="Patient Visual i.e FACES" checked={painData.respiratory_rhythm === 'Patient Visual i.e FACES'} onChange={handleChangePainData} />} label="Patient Visual i.e FACES" />
                      </Grid>
                      <Grid item>
                        <FormControlLabel control={<Radio name="respiratory_rhythm" value="Staff Observation (i.e. PAINAD)" checked={painData.respiratory_rhythm === 'Staff Observation (i.e. PAINAD)'} onChange={handleChangePainData} />} label="Staff Observation (i.e. PAINAD)" />
                      </Grid>
                      <Grid item>
                        <FormControlLabel control={<Radio name="respiratory_rhythm" value="No scale used" checked={painData.respiratory_rhythm === 'No scale used'} onChange={handleChangePainData} />} label="No scale used" />
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Pain Observations:</Typography>
                  </Grid>
                  {['Crying', 'Facial grimacing', 'Grabbing/holding body part', 'Guarded movements', 'Splinting', 'Thrashing', 'Wincing upon movement', 'Other'].map((label) => (
                    <Grid item xs={12} md={2} key={label}>
                      <FormControlLabel control={<Checkbox name="pain_observations" value={label} checked={painData.pain_observations.includes(label)} onChange={handleChangePainData} />} label={label} />
                    </Grid>
                  ))}

                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Pain duration:</Typography>
                  </Grid>
                  {['Intermittent', 'Frequent', 'Constant', 'Other'].map((label) => (
                    <Grid item xs={12} md={2} key={label}>
                      <FormControlLabel control={<Checkbox name="pain_duration" value={label} checked={painData.pain_duration.includes(label)} onChange={handleChangePainData} />} label={label} />
                    </Grid>
                  ))}

                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Pain Frequency:</Typography>
                  </Grid>
                  {['No pattern', 'Constant', 'Intermittent', 'At right time', 'In the morning', 'Breakthrough', 'Other'].map((label) => (
                    <Grid item xs={12} md={2} key={label}>
                      <FormControlLabel control={<Checkbox name="pain_frequency" value={label} checked={painData.pain_frequency.includes(label)} onChange={handleChangePainData} />} label={label} />
                    </Grid>
                  ))}

                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Pain character:</Typography>
                  </Grid>
                  {['Aching', 'Cramping', 'Numb', 'Tender', 'Other', 'Burning', 'Deep', 'Penetrating', 'Tiring', 'Dull', 'Exhausting', 'Pressure', 'Unbearable', 'Radiating', 'Gnawing', 'Sharp', 'Patient unable to describe', 'Stabbing', 'Miserable', 'Shooting', 'Throbbing', 'Nagging', 'Squeezing'].map((label) => (
                    <Grid item xs={12} md={2} key={label}>
                      <FormControlLabel control={<Checkbox name="pain_character" value={label} checked={painData.pain_character.includes(label)} onChange={handleChangePainData} />} label={label} />
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Worsened by:</Typography>
                  </Grid>
                  {['Change in position', 'Cold', 'Heat', 'Movement', 'Sitting', 'Standing', 'Walking', 'Other'].map((label) => (
                    <Grid item xs={12} md={2} key={label}>
                      <FormControlLabel control={<Checkbox name="worsened_by" value={label} checked={painData.worsened_by.includes(label)} onChange={handleChangePainData} />} label={label} />
                    </Grid>
                  ))}

                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Relieved by:</Typography>
                  </Grid>
                  {['Heat', 'Ice', 'Massage', 'Medication', 'Repositioning', 'Rest / relaxation', 'Other'].map((label) => (
                    <Grid item xs={12} md={2} key={label}>
                      <FormControlLabel control={<Checkbox name="relieved_by" value={label} checked={painData.relieved_by.includes(label)} onChange={handleChangePainData} />} label={label} />
                    </Grid>
                  ))}

                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Effects on function / quality of life:</Typography>
                  </Grid>
                  {['Activities', 'Appetite', 'Energy', 'Socialization', 'Sleep', 'Other'].map((label) => (
                    <Grid item xs={12} md={2} key={label}>
                      <FormControlLabel control={<Checkbox name="effects_on_function" value={label} checked={painData.effects_on_function.includes(label)} onChange={handleChangePainData} />} label={label} />
                    </Grid>
                  ))}

                  <Grid item xs={12}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Current pain management and effectiveness:</Typography>
                      <TextField id="current_pain_management" name="current_pain_management" type="text" value={painData.current_pain_management} onChange={handleChangePainData} />
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Breakthrough pain:</Typography>
                  </Grid>
                  {['Never', 'Less than daily', 'Daily', 'Several times a day'].map((label) => (
                    <Grid item xs={12} md={2} key={label}>
                      <FormControlLabel control={<Checkbox name="breakthrough_pain" value={label} checked={painData.breakthrough_pain.includes(label)} onChange={handleChangePainData} />} label={label} />
                    </Grid>
                  ))}

                  <Grid item xs={12}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Additional pain information:</Typography>
                      <TextField id="additional_pain_information" name="additional_pain_information" type="text" value={painData.additional_pain_information} onChange={handleChangePainData} />
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            
          </div>
        </Grid>
        <Grid item xs={12}>
          <div
            style={{
              borderLeft: '5px solid #189AAC',
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              minHeight: '420px'
            }}
          >
            <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
              <h2>PAIN ASSESSMENT IN ADVANCED DEMENTIA SCALE - PAINAD</h2>
            </div>
            <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h3" color="secondary">Instructions Observe the patient for five minutes before scoring their behaviors. </Typography>
                <Typography variant="body1" color="secondary">Observe the patient for five minutes before scoring their behaviors.</Typography>
                <Typography variant="body1" color="secondary">Assess the patient during active periods, such as turning, walking, and transferring.</Typography>
                <Typography variant="body1" color="secondary">Rate the patient for each of the five observed behaviors.</Typography>
                <Typography variant="body1" color="secondary">Obtain a total score by adding the scores of the five behaviors.</Typography>
                <Typography variant="body1" color="secondary">The total score can range from 0 to 10.</Typography>
                <Typography variant="body1" color="secondary">Note that the 0-10 score of the PAINAD scale is not the same as the 0-10 verbal descriptive pain rating scale.</Typography>

                <Grid container spacing={3} sx={{ p: 1 }}>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Behavior</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel 
                          value="0" 
                          control={<Radio />} 
                          name="pain_assessment_behavior" 
                          label="Normal (0)" 
                          checked={painadData.pain_assessment_behavior === '0'}
                          onChange={(e: any) => handleChangePainadData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="1"
                          control={<Radio />}
                          label="Occasional labored breathing or short periods of hyperventilation (1)"
                          name="pain_assessment_behavior"
                          checked={painadData.pain_assessment_behavior === '1'}
                          onChange={(e: any) => handleChangePainadData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="2"
                          control={<Radio />}
                          label="Noisy labored breathing, long periods of hyperventilation, Cheyne-Stokes respirations (2)"
                          name="pain_assessment_behavior"
                          checked={painadData.pain_assessment_behavior === '2'}
                          onChange={(e: any) => handleChangePainadData(e)}
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">*Negative Vocalizations</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel 
                          value="0" 
                          control={<Radio />} 
                          label="*None (0)"
                          name="pain_assessment_negative_vocalizations"
                          checked={painadData.pain_assessment_negative_vocalizations === '0'}
                          onChange={(e: any) => handleChangePainadData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="1"
                          control={<Radio />}
                          label="*Occasional moaning or groaning, *low-level speech with negative or disapproving quality (1)"
                          name="pain_assessment_negative_vocalizations"
                          checked={painadData.pain_assessment_negative_vocalizations === '1'}
                          onChange={(e: any) => handleChangePainadData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="2"
                          control={<Radio />}
                          label="*Repeated, troubled calls, *loud moaning or groaning, *crying (2)"
                          name="pain_assessment_negative_vocalizations"
                          checked={painadData.pain_assessment_negative_vocalizations === '2'}
                          onChange={(e: any) => handleChangePainadData(e)}
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">*Facial Expression</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel value="0" control={<Radio />} name="pain_assessment_facial_expression" label="*Smiling or expressionless (0)" checked={painadData.pain_assessment_facial_expression === '0'} onChange={(e: any) => handleChangePainadData(e)} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel value="1" control={<Radio />} name="pain_assessment_facial_expression" label="*Sad *frightened *frowning (1)" checked={painadData.pain_assessment_facial_expression === '1'} onChange={(e: any) => handleChangePainadData(e)} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel value="2" control={<Radio />} name="pain_assessment_facial_expression" label="*Facial grimacing (2)" checked={painadData.pain_assessment_facial_expression === '2'} onChange={(e: any) => handleChangePainadData(e)} />
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">
                      Body Language
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel 
                        value="0" 
                        name="pain_assessment_body_language" 
                        control={<Radio />} label="*Relaxed (0)" 
                        checked={painadData.pain_assessment_body_language === '0'}
                        onChange={(e: any) => handleChangePainadData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel 
                        value="1" 
                        name="pain_assessment_body_language" 
                        control={<Radio />} 
                        label="*Tense *Distressed pacing *Fidgeting (1)" 
                        checked={painadData.pain_assessment_body_language === '1'}
                        onChange={(e: any) => handleChangePainadData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="2"
                          name="pain_assessment_body_language"
                          control={<Radio />}
                          label="*Rigid *Fists clenched *Knees pulled up *Pulling or pushing away *Strikling out (2)"
                          checked={painadData.pain_assessment_body_language === '2'}
                          onChange={(e: any) => handleChangePainadData(e)}
                        />
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">
                      *Consolability
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel name="pain_consolability" value="0" control={<Radio />} label="No need to console (0)" checked={painadData.pain_consolability === '0'} onChange={(e: any) => handleChangePainadData(e)} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel name="pain_consolability" value="1" control={<Radio />} label="Distracted or reassured by voice or touch (1)" checked={painadData.pain_consolability === '1'} onChange={(e: any) => handleChangePainadData(e)} />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel name="pain_consolability" value="2" control={<Radio />} label="Unable to console distract reassure (2)" checked={painadData.pain_consolability === '2'} onChange={(e: any) => handleChangePainadData(e)} />
                      </Grid>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">
                      *PAINAD Total Score: {painadData.painad_total_score}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </div>
        </Grid>
        <Grid item xs={12}>
          <div
            style={{
              borderLeft: '5px solid #189AAC',
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              minHeight: '420px'
            }}
          >
            <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
              <h2>FLACC Behavivioral Pain Assessment Scale</h2>
            </div>
            <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12}>
                <Grid container spacing={3} sx={{ p: 1 }}>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Face</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="0"
                          name="flacc_face"
                          control={<Radio />}
                          label="No Particular expression or smile (0)"
                          checked={flaccData.flacc_face === '0'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="1"
                          name="flacc_face"
                          control={<Radio />}
                          label="Occasional grimace or frown; withdrawn; disinterested (1)"
                          checked={flaccData.flacc_face === '1'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="2"
                          name="flacc_face"
                          control={<Radio />}
                          label="Frequent to constant frown, clenched jaw, quivering chin (2)"
                          checked={flaccData.flacc_face === '2'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Legs</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="0"
                          name="flacc_legs"
                          control={<Radio />}
                          label="Normal position or relaxed (0)"
                          checked={flaccData.flacc_legs === '0'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="1"
                          name="flacc_legs"
                          control={<Radio />}
                          label="Uneasy, restless, tense (1)"
                          checked={flaccData.flacc_legs === '1'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="2"
                          name="flacc_legs"
                          control={<Radio />}
                          label="Kicking, or legs drawn up (2)"
                          checked={flaccData.flacc_legs === '2'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Activity</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="0"
                          name="flacc_activity"
                          control={<Radio />}
                          label="Lying quietly, normal position, moves easily (0)"
                          checked={flaccData.flacc_activity === '0'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="1"
                          name="flacc_activity"
                          control={<Radio />}
                          label="Squirming, shifting back and forth, tense (1)"
                          checked={flaccData.flacc_activity === '1'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="2"
                          name="flacc_activity"
                          control={<Radio />}
                          label="Arched, rigid, or jerking (2)"
                          checked={flaccData.flacc_activity === '2'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Cry</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="0"
                          name="flacc_cry"
                          control={<Radio />}
                          label="No cry (awake or asleep) (0)"
                          checked={flaccData.flacc_cry === '0'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="1"
                          name="flacc_cry"
                          control={<Radio />}
                          label="Moans or whimpers; occasional complaint (1)"
                          checked={flaccData.flacc_cry === '1'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="2"
                          name="flacc_cry"
                          control={<Radio />}
                          label="Crying steadily, screams or sobs; frequent complaints (2)"
                          checked={flaccData.flacc_cry === '2'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Consolability</Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="0"
                          name="flacc_consolability"
                          control={<Radio />}
                          label="Content, relaxed (0)"
                          checked={flaccData.flacc_consolability === '0'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="1"
                          name="flacc_consolability"
                          control={<Radio />}
                          label="Reassured by occasional touching, hugging, or being talked to; distractible (1)"
                          checked={flaccData.flacc_consolability === '1'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControlLabel
                          value="2"
                          name="flacc_consolability"
                          control={<Radio />}
                          label="Difficult to console or comfort (2)"
                          checked={flaccData.flacc_consolability === '2'}
                          onChange={(e: any) => handleChangeFlaccData(e)}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">
                      Total Score: {flaccData.total_score}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </div>
        </Grid>
        <Grid item xs={12}>
          <div
            style={{
              borderLeft: '5px solid #189AAC',
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              minHeight: '420px'
            }}
          >
            <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
              <h2>CARDIOVASCULAR</h2>
            </div>
            
            <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12} md={6}>
                <FormGroup row sx={{ justifyContent: 'space-between' }}>
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.chest_pain} onChange={(e: any) => handleChangeCardiovascularData(e)} name="chest_pain" />}
                    label="Chest pain"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.dizziness} onChange={(e: any) => handleChangeCardiovascularData(e)} name="dizziness" />}
                    label="Dizziness"
                  />
                </FormGroup>
              </Grid>
              <Grid item xs={12}>
                <FormGroup row sx={{ justifyContent: 'space-between' }}>
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.edema.includes('Edema')} onChange={(e: any) => handleChangeCardiovascularData(e)} name="edema" value="Edema" />}
                    label="Edema"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.edema.includes('Pedal')} onChange={(e: any) => handleChangeCardiovascularData(e)} name="edema" value="Pedal" />}
                    label="Pedal"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.edema.includes('Right')} onChange={(e: any) => handleChangeCardiovascularData(e)} name="edema" value="Right" />}
                    label="Right"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.edema.includes('Left')} onChange={(e: any) => handleChangeCardiovascularData(e)} name="edema" value="Left" />}
                    label="Left"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.edema.includes('Sacral')} onChange={(e: any) => handleChangeCardiovascularData(e)} name="edema" value="Sacral" />}
                    label="Sacral"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.edema.includes('Dependent')} onChange={(e: any) => handleChangeCardiovascularData(e)} name="edema" value="Dependent" />}
                    label="Dependent"
                  />
                </FormGroup>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">
                  1+ Trace pitting slight indentation, no perceptible swelling, rapid response
                </Typography>
                <Typography variant="body1" color="secondary">
                  2+ Mild pitting indentation subsides rapidly, within 10-15 seconds
                </Typography>
                <Typography variant="body1" color="secondary">
                  3+ Moderate pitting indentation remains for 1-2 minutes
                </Typography>
                <Typography variant="body1" color="secondary">
                  4+ Severe pitting indentation remains for greater than 2 minutes
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Grid container spacing={3} sx={{ p: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Right Foot:</Typography>
                      <TextField id="right_foot" name="right_foot" type="text" value={cardiovascularData.right_foot} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Left Foot:</Typography>
                      <TextField id="left_foot" name="left_foot" type="text" value={cardiovascularData.left_foot} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Right Ankle:</Typography>
                      <TextField id="right_ankle" name="right_ankle" type="text" value={cardiovascularData.right_ankle} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Left Ankle:</Typography>
                      <TextField id="left_ankle" name="left_ankle" type="text" value={cardiovascularData.left_ankle} onChange={(e: any) => handleChangeCardiovascularData(e)  } />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Right Calf:</Typography>
                      <TextField id="right_calf" name="right_calf" type="text" value={cardiovascularData.right_calf} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Left Calf:</Typography>
                      <TextField id="left_calf" name="left_calf" type="text" value={cardiovascularData.left_calf} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  {/* <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Right Leg:</Typography>
                      <TextField id="right_leg" name="right_leg" type="text" value={cardiovascularData.right_leg} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Left Leg:</Typography>
                      <TextField id="left_leg" name="left_leg" type="text" value={cardiovascularData.left_leg} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid> */}
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Right Hand:</Typography>
                      <TextField id="right_hand" name="right_hand" type="text" value={cardiovascularData.right_hand} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Left Hand:</Typography>
                      <TextField id="left_hand" name="left_hand" type="text" value={cardiovascularData.left_hand} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Right Arm:</Typography>
                      <TextField id="right_arm" name="right_arm" type="text" value={cardiovascularData.right_arm} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Left Arm:</Typography>
                      <TextField id="left_arm" name="left_arm" type="text" value={cardiovascularData.left_arm} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Right Scrotum:</Typography>
                      <TextField id="right_scrotum" name="right_scrotum" type="text" value={cardiovascularData.right_scrotum} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Left Scrotum:</Typography>
                      <TextField id="left_scrotum" name="left_scrotum" type="text" value={cardiovascularData.left_scrotum} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Right Face:</Typography>
                      <TextField id="right_face" name="right_face" type="text" value={cardiovascularData.right_face} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Left Face:</Typography>
                      <TextField id="left_face" name="left_face" type="text" value={cardiovascularData.left_face} onChange={(e: any) => handleChangeCardiovascularData(e)} />
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.irregular_heart_sounds} onChange={handleChangeCardiovascularData} name="irregular_heart_sounds" />}
                  label="Irregular heart sounds"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.neck_vein_distention} onChange={handleChangeCardiovascularData} name="neck_vein_distention" />}
                  label="Neck Vein Distention"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">
                  Devices:
                </Typography>
                <FormGroup sx={{ justifyContent: 'space-between' }}>
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.devices.includes('Pacemaker: date Inserted')} onChange={handleChangeCardiovascularData} name="devices" value="Pacemaker: date Inserted" />}
                    label="Pacemaker: date Inserted"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.devices.includes('Left Ventricular Assist Device')} onChange={handleChangeCardiovascularData} name="devices" value="Left Ventricular Assist Device" />}
                    label="Left Ventricular Assist Device"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.devices.includes('Activated Automated Implantable Cardioverter Defibrillator')} onChange={handleChangeCardiovascularData} name="devices" value="Activated Automated Implantable Cardioverter Defibrillator" />}
                    label="Activated Automated Implantable Cardioverter Defibrillator"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.devices.includes('Deactivated Automated Implantable Cardioverter Defibrillator')} onChange={handleChangeCardiovascularData} name="devices" value="Deactivated Automated Implantable Cardioverter Defibrillator" />}
                    label="Deactivated Automated Implantable Cardioverter Defibrillator"
                  />
                </FormGroup>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">
                  Additional details - cardiovascular:
                </Typography>
                <FormGroup sx={{ justifyContent: 'space-between' }}>
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.additional_details} onChange={handleChangeCardiovascularData} name="additional_details" />}
                    label="Peripheral Pulses:"
                  />
                </FormGroup>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">
                  Present:
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.present.includes('RUE')} onChange={handleChangeCardiovascularData} name="present" value="RUE" />}
                  label="RUE"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.present.includes('RLE')} onChange={handleChangeCardiovascularData} name="present" value="RLE" />}
                  label="RLE"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.present.includes('LUE')} onChange={handleChangeCardiovascularData} name="present" value="LUE" />}
                  label="LUE"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.present.includes('LLE')} onChange={handleChangeCardiovascularData} name="present" value="LLE" />}
                  label="LLE"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">
                  Bounding:
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.bounding.includes('RUE')} onChange={handleChangeCardiovascularData} name="bounding" value="RUE" />}
                  label="RUE"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.bounding.includes('RLE')} onChange={handleChangeCardiovascularData} name="bounding" value="RLE" />}
                  label="RLE"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.bounding.includes('LUE')} onChange={handleChangeCardiovascularData} name="bounding" value="LUE" />}
                  label="LUE"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.bounding.includes('LLE')} onChange={handleChangeCardiovascularData} name="bounding" value="LLE" />}
                  label="LLE"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">
                  Weak / Thready:
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.weak_thready.includes('RUE')} onChange={handleChangeCardiovascularData} name="weak_thready" value="RUE" />}
                  label="RUE"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.weak_thready.includes('RLE')} onChange={handleChangeCardiovascularData} name="weak_thready" value="RLE" />}
                  label="RLE"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.weak_thready.includes('LUE')} onChange={handleChangeCardiovascularData} name="weak_thready" value="LUE" />}
                  label="LUE"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.weak_thready.includes('LLE')} onChange={handleChangeCardiovascularData} name="weak_thready" value="LLE" />}
                  label="LLE"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">
                  Absent:
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.absent.includes('RUE')} onChange={handleChangeCardiovascularData} name="absent" value="RUE" />}
                  label="RUE"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.absent.includes('RLE')} onChange={handleChangeCardiovascularData} name="absent" value="RLE" />}
                  label="RLE"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.absent.includes('LUE')} onChange={handleChangeCardiovascularData} name="absent" value="LUE" />}
                  label="LUE"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={<Checkbox checked={cardiovascularData.absent.includes('LLE')} onChange={handleChangeCardiovascularData} name="absent" value="LLE" />}
                  label="LLE"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">
                  Cardiovascular Note:
                </Typography>
                <FormGroup sx={{ justifyContent: 'space-between' }}>
                  <FormControlLabel
                    control={<Checkbox checked={cardiovascularData.cardiovascular_note} onChange={handleChangeCardiovascularData} name="cardiovascular_note" />}
                    label="Other:"
                  />
                </FormGroup>
              </Grid>
            </Grid>
            
          </div>
        </Grid>
        {/* start   RESPIRATORY*/}
        <Grid item xs={12}>
          <div
            style={{
              borderLeft: '5px solid #189AAC',
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              minHeight: '420px'
            }}
          >
            <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
              <h2>RESPIRATORY</h2>
            </div>
            <Grid container spacing={3} sx={{ p: 1 }}>
              {/* Clear */}
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">Clear:</Typography>
              </Grid>
              {['RUL', 'RML', 'RLL', 'LUL', 'LLL'].map(label => (
                <Grid item xs={12} md={2} key={`clear_${label}`}>
                  <FormControlLabel
                    control={<Checkbox name={`clear`} value={label} checked={respiratoryData.clear.includes(label)} onChange={handleChangeRespiratoryData} />}
                    label={label}
                  />
                </Grid>
              ))}
              {/* Diminished */}
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">Diminished:</Typography>
              </Grid>
              {['RUL', 'RML', 'RLL', 'LUL', 'LLL'].map(label => (
                <Grid item xs={12} md={2} key={`diminished_${label}`}>
                  <FormControlLabel
                    control={<Checkbox name={`diminished`} value={label} checked={respiratoryData.diminished.includes(label)} onChange={handleChangeRespiratoryData} />}
                    label={label}
                  />
                </Grid>
              ))}
              {/* Repeat for other categories like Crackles, Rhonchi, Wheezing, Rales, Absent */}
              {/* ... */}
              {/* Note */}
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">Note:</Typography>
                <TextField id="note" name="note" type="text" value={respiratoryData.note} onChange={handleChangeRespiratoryData} />
              </Grid>
              {/* Breathing */}
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">Breathing:</Typography>
              </Grid>
              {['Apnea', 'Agonal', 'Cheyne - Stokes', 'Other'].map(label => (
                <Grid item xs={12} md={2} key={`breathing_${label}`}>
                  <FormControlLabel
                    control={<Checkbox name={`breathing`} value={label} checked={respiratoryData.breathing.includes(label)} onChange={handleChangeRespiratoryData} />}
                    label={label}
                  />
                </Grid>
              ))}
              {/* Oxygen use */}
              <Grid item xs={12}>
                <Typography variant="body1" color="secondary">Oxygen use:</Typography>
                <Typography variant="body1" color="secondary">Fio2 - Inhaled 02 Concentration:</Typography>
                <FormGroup sx={{ justifyContent: 'space-between' }}>
                  {['CPAP', 'BIPAP'].map(label => (
                    <FormControlLabel
                      key={label}
                      control={<Checkbox name="oxygen_use" value={label} checked={respiratoryData.oxygen_use.includes(label)} onChange={handleChangeRespiratoryData} />}
                      label={label}
                    />
                  ))}
                  <Grid container xs={12}>
                    {['Cough', 'Increase in respiratory secretions/audible congestion', 'Other'].map(label => (
                      <Grid item xs={12} md={2} key={`oxygen_use_${label}`}>
                        <FormControlLabel
                          control={<Checkbox name="oxygen_use" value={label} checked={respiratoryData.oxygen_use.includes(label)} onChange={handleChangeRespiratoryData} />}
                          label={label}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </FormGroup>

              </Grid>
              {/* Shortness of Breath Screening */}
              <Grid item xs={12}>
                <Typography variant="h4" color="dark">Shortness of Breath Screening:</Typography>
                <Typography variant="body1" color="secondary">Key: 0 - None 1-3 -Milld 4-7 - Moderate 8-10 Severe:</Typography>
                <Grid container spacing={3} sx={{ p: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Shortness of Breath level now:</Typography>
                      <TextField id="level_now" name="level_now" type="number" value={respiratoryData.shortness_of_breath.level_now} onChange={handleChangeRespiratoryData} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Worst Shortness of Breath level experienced:</Typography>
                      <TextField id="worst_level" name="worst_level" type="number" value={respiratoryData.shortness_of_breath.worst_level} onChange={handleChangeRespiratoryData} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Best Shortness of Breath level experienced:</Typography>
                      <TextField id="best_level" name="best_level" type="number" value={respiratoryData.shortness_of_breath.best_level} onChange={handleChangeRespiratoryData} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <Typography variant="body1" color="secondary">Patient's acceptable level of Shortness of Breath:</Typography>
                      <TextField id="acceptable_level" name="acceptable_level" type="number" value={respiratoryData.shortness_of_breath.acceptable_level} onChange={handleChangeRespiratoryData} />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel
                      control={<Checkbox name="walk_without_shortness" checked={respiratoryData.shortness_of_breath.walk_without_shortness} onChange={handleChangeRespiratoryData} />}
                      label="Able to walk 20 ft without shortness of breath"
                    />
                  </Grid>
                </Grid>
              </Grid>
              {/* Shortness of Breath Screening */}
            </Grid>
          </div>
        </Grid>
        {/* end   RESPIRATORY*/}
        {/* start   GENITOURINARY*/}
        <Grid item xs={12}>
          <div
            style={{
              borderLeft: '5px solid #189AAC',
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              minHeight: '420px'
            }}
          >
            <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
              <h2>GENITOURINARY</h2>
            </div>
            <Grid container spacing={3} sx={{ p: 1 }}>
              {/* start  Absence of urinary:*/}
              <Grid item xs={12}>
                <FormGroup sx={{ justifyContent: 'space-between' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="absence_urinary_output"
                        checked={genitourinaryData.absence_urinary_output}
                        onChange={handleChangeGenitourinaryData}
                      />
                    }
                    label="Absence of urinary output in 24 hr."
                  />
                  <Grid container xs={12}>
                    <Grid item xs={12} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="decrease_urinary_output"
                            checked={genitourinaryData.decrease_urinary_output}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Decrease in urinary output"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="change_bladder_incontinence"
                            checked={genitourinaryData.change_bladder_incontinence}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Change in bladder incontinence"
                      />
                    </Grid>
                  </Grid>
                  <Grid container xs={12}>
                    <Grid item xs={12} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="distension"
                            checked={genitourinaryData.distension}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Distension"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="incontinence"
                            checked={genitourinaryData.incontinence}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Incontinence"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="retention"
                            checked={genitourinaryData.retention}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Retention"
                      />
                    </Grid>
                  </Grid>
                  <Grid container xs={12}>
                    <Grid item xs={12} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="current_ss_infection.burning"
                            checked={genitourinaryData.current_ss_infection.burning}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Burning"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="current_ss_infection.hematuria"
                            checked={genitourinaryData.current_ss_infection.hematuria}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Hematuria"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="current_ss_infection.fever"
                            checked={genitourinaryData.current_ss_infection.fever}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Fever"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="current_ss_infection.spasms"
                            checked={genitourinaryData.current_ss_infection.spasms}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Spasms"
                      />
                    </Grid>
                  </Grid>
                  <Grid container xs={12} sx={{ ml: 2 }}>
                    <Grid item xs={12} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="current_ss_infection.foul_smelling_urine"
                            checked={genitourinaryData.current_ss_infection.foul_smelling_urine}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Foul or strong smelling urine"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="current_ss_infection.cloudy_urine"
                            checked={genitourinaryData.current_ss_infection.cloudy_urine}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Cloudy urine"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="current_ss_infection.other"
                            checked={genitourinaryData.current_ss_infection.other}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Other"
                      />
                    </Grid>
                  </Grid>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="indwelling_catheter_flush"
                        checked={genitourinaryData.indwelling_catheter_flush}
                        onChange={handleChangeGenitourinaryData}
                      />
                    }
                    label="Indwelling Catheter: Flush: Size fr ml balloon Size :"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="other_catheter"
                        checked={genitourinaryData.other_catheter}
                        onChange={handleChangeGenitourinaryData}
                      />
                    }
                    label="Other catheter :"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="no_deficit"
                        checked={genitourinaryData.no_deficit}
                        onChange={handleChangeGenitourinaryData}
                      />
                    }
                    label="No deficit :"
                  />
                  <Typography variant="h4" color="secondary">
                    Urinary Diversion /Ostomy:
                  </Typography>
                  <Grid container xs={12}>
                    <Grid item xs={12} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="urinary_diversion_ostomy_ileal_conduit"
                            checked={genitourinaryData.urinary_diversion_ostomy_ileal_conduit}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Ileal conduit Site / flush :"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="urinary_diversion_ostomy_nephrostomy"
                            checked={genitourinaryData.urinary_diversion_ostomy_nephrostomy}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Nephrostomy Site / flush"
                      />
                    </Grid>
                  </Grid>
                  <Grid container xs={12}>
                    <Grid item xs={12} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="urinary_diversion_ostomy_ureterostomy"
                            checked={genitourinaryData.urinary_diversion_ostomy_ureterostomy}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Ureterostomy Site / flush :"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="urinary_diversion_ostomy_other"
                            checked={genitourinaryData.urinary_diversion_ostomy_other}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Other Site / flush"
                      />
                    </Grid>
                  </Grid>
                  <Grid container xs={12}>
                    <Grid item xs={12} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="urinary_diversion_ostomy_suprapubic_catheter"
                            checked={genitourinaryData.urinary_diversion_ostomy_suprapubic_catheter}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Suprapubic Catheter:"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            name="urinary_diversion_ostomy_condom_catheter"
                            checked={genitourinaryData.urinary_diversion_ostomy_condom_catheter}
                            onChange={handleChangeGenitourinaryData}
                          />
                        }
                        label="Condom Catheter"
                      />
                    </Grid>
                  </Grid>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="indwelling_catheter_flush"
                        checked={genitourinaryData.indwelling_catheter_flush}
                        onChange={handleChangeGenitourinaryData}
                      />
                    }
                    label="Indwelling Catheter"
                  />
                </FormGroup>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <Typography variant="body1" color="secondary">
                      Flush:
                    </Typography>
                    <TextField id="flush" name="flush" type="text" value={genitourinaryData.flush} onChange={handleChangeGenitourinaryData} />
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <Typography variant="body1" color="secondary">
                      Size / Balloon:
                    </Typography>
                    <TextField id="size_balloon" name="size_balloon" type="text" value={genitourinaryData.size_balloon} onChange={handleChangeGenitourinaryData} />
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <Typography variant="body1" color="secondary">
                      Describe deficits:
                    </Typography>
                    <TextField id="describe_deficits" name="describe_deficits" type="text" value={genitourinaryData.describe_deficits} onChange={handleChangeGenitourinaryData} />
                  </Stack>
                </Grid>
              </Grid>
              {/* end Absence of urinary: */}
            </Grid>
          </div>
        </Grid>
        {/* end   GENITOURINARY */}
        {/* start   GASTROINTESTINAL*/}
        <Grid item xs={12} >
          <div
            style={{
              borderLeft: '5px solid #189AAC',
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              minHeight: '420px'
            }}
          >
            <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
              <h2>GASTROINTESTINAL</h2>
            </div>
            <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12}>
                <Grid container>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="last_bm" checked={gastrointestinalData.last_bm} onChange={handleChangeGastrointestinalData} />} label="Last BM:" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="unknown" checked={gastrointestinalData.unknown} onChange={handleChangeGastrointestinalData} />} label="Unknown" />
                  </Grid>
                </Grid>
                <FormControlLabel control={<Checkbox name="bowel_sounds" checked={gastrointestinalData.bowel_sounds} onChange={handleChangeGastrointestinalData} />} label="Bowel sounds" />
                {/* <Grid container>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Present:</Typography>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="present.ruq" checked={gastrointestinalData.present.ruq} onChange={handleChangeGastrointestinalData} />} label="RUQ" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="present.rlq" checked={gastrointestinalData.present.rlq} onChange={handleChangeGastrointestinalData} />} label="RLQ" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="present.luq" checked={gastrointestinalData.present.luq} onChange={handleChangeGastrointestinalData} />} label="LUQ" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="present.llq" checked={gastrointestinalData.present.llq} onChange={handleChangeGastrointestinalData} />} label="LLQ" />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Hyper-active:</Typography>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="hyper_active.ruq" checked={gastrointestinalData.hyper_active.ruq} onChange={handleChangeGastrointestinalData} />} label="RUQ" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="hyper_active.rlq" checked={gastrointestinalData.hyper_active.rlq} onChange={handleChangeGastrointestinalData} />} label="RLQ" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="hyper_active.luq" checked={gastrointestinalData.hyper_active.luq} onChange={handleChangeGastrointestinalData} />} label="LUQ" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="hyper_active.llq" checked={gastrointestinalData.hyper_active.llq} onChange={handleChangeGastrointestinalData} />} label="LLQ" />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Hypo-active:</Typography>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="hypo_active.ruq" checked={gastrointestinalData.hypo_active.ruq} onChange={handleChangeGastrointestinalData} />} label="RUQ" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="hypo_active.rlq" checked={gastrointestinalData.hypo_active.rlq} onChange={handleChangeGastrointestinalData} />} label="RLQ" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="hypo_active.luq" checked={gastrointestinalData.hypo_active.luq} onChange={handleChangeGastrointestinalData} />} label="LUQ" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="hypo_active.llq" checked={gastrointestinalData.hypo_active.llq} onChange={handleChangeGastrointestinalData} />} label="LLQ" />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Absent:</Typography>
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="absent.ruq" checked={gastrointestinalData.absent.ruq} onChange={handleChangeGastrointestinalData} />} label="RUQ" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="absent.rlq" checked={gastrointestinalData.absent.rlq} onChange={handleChangeGastrointestinalData} />} label="RLQ" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="absent.luq" checked={gastrointestinalData.absent.luq} onChange={handleChangeGastrointestinalData} />} label="LUQ" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="absent.llq" checked={gastrointestinalData.absent.llq} onChange={handleChangeGastrointestinalData} />} label="LLQ" />
                  </Grid>
                </Grid> */}
                <Grid container>
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Present:</Typography>
                  </Grid>
                  {['ruq', 'rlq', 'luq', 'llq'].map((key) => (
                    <Grid item xs={12} md={2} key={`present_${key}`}>
                      <FormControlLabel
                        control={<Checkbox name={`present.${key}`} checked={gastrointestinalData.present[key]} onChange={handleChangeGastrointestinalData} />}
                        label={key.toUpperCase()}
                      />
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Hyper-active:</Typography>
                  </Grid>
                  {['ruq', 'rlq', 'luq', 'llq'].map((key) => (
                    <Grid item xs={12} md={2} key={`hyper_active_${key}`}>
                      <FormControlLabel
                        control={<Checkbox name={`hyper_active.${key}`} checked={gastrointestinalData.hyper_active[key]} onChange={handleChangeGastrointestinalData} />}
                        label={key.toUpperCase()}
                      />
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Hypo-active:</Typography>
                  </Grid>
                  {['ruq', 'rlq', 'luq', 'llq'].map((key) => (
                    <Grid item xs={12} md={2} key={`hypo_active_${key}`}>
                      <FormControlLabel
                        control={<Checkbox name={`hypo_active.${key}`} checked={gastrointestinalData.hypo_active[key]} onChange={(e: any) => handleChangeGastrointestinalData(e)} />}
                        label={key.toUpperCase()}
                      />
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Typography variant="body1" color="secondary">Absent:</Typography>
                  </Grid>
                  {['ruq', 'rlq', 'luq', 'llq'].map((key) => (
                    <Grid item xs={12} md={2} key={`absent_${key}`}>
                      <FormControlLabel
                        control={<Checkbox name={`absent.${key}`} checked={gastrointestinalData.absent[key]} onChange={(e: any) => handleChangeGastrointestinalData(e)} />}
                        label={key.toUpperCase()}
                      />
                    </Grid>
                  ))}
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="rectal_bleeding" checked={gastrointestinalData.rectal_bleeding} onChange={handleChangeGastrointestinalData} />} label="Rectal bleeding" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="hemorrhoids" checked={gastrointestinalData.hemorrhoids} onChange={handleChangeGastrointestinalData} />} label="Hemorrhoids" />
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="bowel_incontinence" checked={gastrointestinalData.bowel_incontinence} onChange={handleChangeGastrointestinalData} />} label="Bowel Incontinence" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="change_bowel_incontinence" checked={gastrointestinalData.change_bowel_incontinence} onChange={handleChangeGastrointestinalData} />} label="Change in bowel incontinence" />
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="constipation" checked={gastrointestinalData.constipation} onChange={handleChangeGastrointestinalData} />} label="Constipation" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="diarrhea" checked={gastrointestinalData.diarrhea} onChange={handleChangeGastrointestinalData} />} label="Diarrhea" />
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="ascites" checked={gastrointestinalData.ascites} onChange={handleChangeGastrointestinalData} />} label="Ascites" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="ostomy_details" checked={gastrointestinalData.ostomy_details} onChange={handleChangeGastrointestinalData} />} label="Ostomy Details:" />
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={4}></Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="drain_details" checked={gastrointestinalData.drain_details} onChange={handleChangeGastrointestinalData} />} label="Drain Details:" />
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="anorexia" checked={gastrointestinalData.anorexia} onChange={handleChangeGastrointestinalData} />} label="Anorexia" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="cachexia" checked={gastrointestinalData.cachexia} onChange={handleChangeGastrointestinalData} />} label="Cachexia" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="nausea" checked={gastrointestinalData.nausea} onChange={handleChangeGastrointestinalData} />} label="Nausea" />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <FormControlLabel control={<Checkbox name="vomiting" checked={gastrointestinalData.vomiting} onChange={handleChangeGastrointestinalData} />} label="Vomiting" />
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={4}></Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="no_intake_last_24hrs" checked={gastrointestinalData.no_intake_last_24hrs} onChange={handleChangeGastrointestinalData} />} label="No intake last 24 hrs" />
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="swallowing_deficits" checked={gastrointestinalData.swallowing_deficits} onChange={handleChangeGastrointestinalData} />} label="Swallowing deficits" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="inability_swallow" checked={gastrointestinalData.inability_swallow} onChange={handleChangeGastrointestinalData} />} label="Inability to swallow (change)" />
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <Typography variant="body1" color="secondary">Diet:</Typography>
                    <TextField id="diet" name="diet" type="text" value={gastrointestinalData.diet} onChange={handleChangeGastrointestinalData} />
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <Typography variant="body1" color="secondary">Percentage eaten in 24 hr:</Typography>
                    <TextField id="percentage_eaten" name="percentage_eaten" type="text" value={gastrointestinalData.percentage_eaten} onChange={handleChangeGastrointestinalData} />
                    <FormControlLabel control={<Checkbox name="npo" checked={gastrointestinalData.npo} onChange={handleChangeGastrointestinalData} sx={{ my: 0 }} />} label="NPO" />
                  </Stack>
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={4}>
                    <Typography color="secondary">Tube feeding:</Typography>
                    <FormControlLabel control={<Checkbox name="tube_feeding" checked={gastrointestinalData.tube_feeding} onChange={handleChangeGastrointestinalData} />} label="Type /Amount:" />
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="placement_checked" checked={gastrointestinalData.placement_checked} onChange={handleChangeGastrointestinalData} />} label="Placement checked:" />
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="most_recent_rbs" checked={gastrointestinalData.most_recent_rbs} onChange={handleChangeGastrointestinalData} />} label="Most Recent RBS:" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="hyperglycemia" checked={gastrointestinalData.hyperglycemia} onChange={handleChangeGastrointestinalData} />} label="Hyperglycemia" />
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="hypoglycemia" checked={gastrointestinalData.hypoglycemia} onChange={handleChangeGastrointestinalData} />} label="Hypoglycemia:" />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="other" checked={gastrointestinalData.other} onChange={handleChangeGastrointestinalData} />} label="Other" />
                  </Grid>
                </Grid>
                <Grid container>
                  <Grid item xs={12} md={4}>
                    <FormControlLabel control={<Checkbox name="no_deficit" checked={gastrointestinalData.no_deficit} onChange={handleChangeGastrointestinalData} />} label="No deficit" />
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <Typography variant="body1" color="secondary">Describe deficits:</Typography>
                    <TextField id="describe_deficits" name="describe_deficits" type="text" value={gastrointestinalData.describe_deficits} onChange={handleChangeGastrointestinalData} />
                  </Stack>
                </Grid>
              </Grid>
            </Grid>
          </div>
        </Grid>
        {/* end   GASTROINTESTINAL */}
      </Grid>
    </MainCard>
    </>
  );
};

export default NursingClinicalNotePage;
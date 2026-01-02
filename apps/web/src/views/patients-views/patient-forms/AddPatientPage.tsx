'use client';
// MATERIAL - UI
import * as React from 'react';
// TYPES
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputLabel,
  ListItemIcon,
  ListItemSecondaryAction,
  MenuItem,
  Modal,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { ArrowDown2 } from 'iconsax-react';
import MainCard from 'components/MainCard';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { AddCircle, Trash } from 'iconsax-react';
import http from '../../../hooks/useCookie';
import AuthService from 'types/AuthService';
// STYLES & constant
// ==============================|| ACCOUNT PROFILE - PERSONAL ||============================== //

const AddPatientPage = () => {
  const router = useRouter();
  const [selected, setSelected] = useState({
    gender: '',
    patient_pharmacy_id: '',
    dme_provider: '',
    primary_diagnosis_id: '',
    hipaa_received: '',
    dnr_id: '',
    race_ethnicity_id: '',
    liaison_primary_id: '',
    emergency_preparedness_level_id: '',
    oxygen_dependent: '',
    patient_consents: '',
    liaison_secondary_id: '',
    veterans_status: ''
  });
  const {  logout} = AuthService();
  const [openPatientPharmacy, setOpenPatientPharmacy] = React.useState(false);
  const [openPrimaryDiagnosis, setOpenPrimaryDiagnosis] = React.useState(false);
  const [openLiaisonPrimary, setOpenLiaisonPrimary] = React.useState(false);
  const [openLiaisonSecondary, setOpenLiaisonSecondary] = React.useState(false);
  const [openRaceEthnicity, setOpenRaceEthnicity] = React.useState(false);
  const [openEmergencyPreparednessLevel, setOpenEmergencyPreparednessLevel] = React.useState(false);
  const [openDnr, setOpenDnr] = React.useState(false);

  const handleOpenPatientPharmacy = () => setOpenPatientPharmacy(true);
  const handleOpenPrimaryDiagnosis = () => setOpenPrimaryDiagnosis(true);
  const handleOpenDnr = () => setOpenDnr(true);
  const handleOpenEmergencyPreparednessLevel = () => setOpenEmergencyPreparednessLevel(true);
  const handleOpenRaceEthnicity = () => setOpenRaceEthnicity(true);
  const handleOpenLiaisonSecondary = () => setOpenLiaisonSecondary(true);
  const handleOpenLiaisonPrimary = () => setOpenLiaisonPrimary(true);

  const handleClosePrimaryDiagnosis = () => setOpenPrimaryDiagnosis(false);
  const handleClosePatientPharmacy = () => setOpenPatientPharmacy(false);
  const handleCloseDnr = () => setOpenDnr(false);
  const handleCloseRaceEthnicity = () => setOpenRaceEthnicity(false);
  const handleCloseEmergencyPreparednessLevel = () => setOpenEmergencyPreparednessLevel(false);
  const handleCloseLiaisonPrimary = () => setOpenLiaisonPrimary(false);
  const handleCloseLiaisonSecondary = () => setOpenLiaisonSecondary(false);

  const [dmeProviderData, setDmeProviderData] = useState<Array<{ value: string; label: string }>>([]);
  const [primaryDiagnosisList, setPrimaryDiagnosisList] = useState<Array<{ code: string; description: string; id?: number }>>([]);
  const [primaryDiagnosisListLoading, setPrimaryDiagnosisListLoading] = useState(false);
  const [selectedPrimaryDiagnosis, setSelectedPrimaryDiagnosis] = useState<{ code: string; description: string; id?: number } | null>(null);
  const [primaryDiagnosisSearchQuery, setPrimaryDiagnosisSearchQuery] = useState('');
  const [patientPharmacyData, setPatientPharmacyData] = useState([{ id: '', name: '' }]);
  const [liaisonPrimaryData, setLiaisonPrimaryData] = useState<Array<{ id: string | number; first_name?: string; last_name?: string; phone?: string; email?: string; relationship?: string }>>([]);
  const [liaisonSecondaryData, setLiaisonSecondaryData] = useState<Array<{ id: string | number; first_name?: string; last_name?: string; phone?: string; email?: string; relationship?: string }>>([]);
  const [raceEthnicityData, setRaceEthnicityData] = useState<Array<{ id: string | number; race?: string; ethnicity?: string }>>([]);
  const [raceEthnicityOptions, setRaceEthnicityOptions] = useState<{ races: string[]; detailedRaces: string[]; ethnicities: string[]; supportsMultiple: boolean } | null>(null);
  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);
  const [selectedEthnicities, setSelectedEthnicities] = useState<string[]>([]);
  const [raceEthnicityOptionsLoading, setRaceEthnicityOptionsLoading] = useState(false);
  const [detailedRacesExpanded, setDetailedRacesExpanded] = useState(false);
  const [emergencyPreparednessData, setEmergencyPreparednessLevelData] = useState<Array<{ id: string | number; level?: string; description?: string; name?: string }>>([]);
  const [dnrData, setDnrData] = useState<Array<{ id: string | number; dnr_status?: string | null; dnr_date?: string | null; dnr_notes?: string | null; name?: string }>>([]);

  const [newPrimaryDiagnosis, setNewPrimaryDiagnosis] = useState<{ code?: string; description?: string }>({ code: '', description: '' });
  const [newPatientPharmacy, setNewPatientPharmacy] = useState<{ name: string }>({ name: '' });
  const [newDnr, setNewDnr] = useState<{ dnr_status?: string; dnr_date?: string; dnr_notes?: string }>({ dnr_status: '', dnr_date: '', dnr_notes: '' });
  const [newLiaisonPrimary, setNewLiaisonPrimary] = useState<{ first_name?: string; last_name?: string; phone?: string; email?: string; relationship?: string }>({ first_name: '', last_name: '', phone: '', email: '', relationship: '' });
  const [newLiaisonSecondary, setNewLiaisonSecondary] = useState<{ first_name?: string; last_name?: string; phone?: string; email?: string; relationship?: string }>({ first_name: '', last_name: '', phone: '', email: '', relationship: '' });
  const [newRaceEthnicity, setNewRaceEthnicity] = useState<{ race: string; ethnicity: string }>({ race: '', ethnicity: '' });
  const [newEmergencyPreparednessLevel, setNewEmergencyPreparednessLevel] = useState<{ level?: string; description?: string }>({ level: '', description: '' });

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
    oxygen_dependent: '',
    patient_consents: '',
    gender: '',
    dme_provider: '',
    patient_pharmacy_id: '',
    primary_diagnosis_id: '',
    veterans_status: '',
    date_of_referral: '',
    who_took_referral: '',
    referral_source: '',
    referral_source_other: ''
  });
  const [errorMessage, setErrorMessage] = useState<any>({
    frist_name: '',
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
    oxygen_dependent: '',
    patient_consents: '',
    gender: '',
    dme_provider: '',
    patient_pharmacy_id: '',
    primary_diagnosis_id: '',
    veterans_status: '',
    date_of_referral: '',
    who_took_referral: '',
    referral_source: '',
    referral_source_other: ''
  });

  // Format SSN as xxx-xx-xxxx
  const formatSSN = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // Limit to 9 digits
    const limited = digits.slice(0, 9);
    // Format as xxx-xx-xxxx
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 5) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 5)}-${limited.slice(5)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Special handling for SSN field
    if (name === 'ssn') {
      const formatted = formatSSN(value);
      setPatientData((prevData: any) => ({
        ...prevData,
        [name]: formatted
      }));
    } else {
      setPatientData((prevData: any) => ({
        ...prevData,
        [name]: value
      }));
    }
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Exclude auto-managed fields (timestamps, IDs that shouldn't be sent)
    const excludedFields = [
      'id',
      'created_at',
      'updated_at',
      'createdAt',
      'updatedAt'
    ];
    
    // Filter out excluded fields
    const updateableFields: any = {};
    Object.keys(patientData).forEach(key => {
      if (!excludedFields.includes(key)) {
        updateableFields[key] = patientData[key];
      }
    });
    
    // Prepare payload with proper data types and field name mappings
    const payload = {
      ...updateableFields,
      // Map field names to match schema exactly
      gender: patientData.gender || patientData.genders || selected.gender || '',
      // Schema supports both middle_name and mi, keep both if present
      middle_name: patientData.middle_name || patientData.mi || '',
      // Convert string "1"/"0" to boolean true/false
      hipaa_received: patientData.hipaa_received === "1" || patientData.hipaa_received === true || patientData.hipaa_received === "true",
      patient_consents: patientData.patient_consents === "1" || patientData.patient_consents === true || patientData.patient_consents === "true",
      oxygen_dependent: patientData.oxygen_dependent === "1" || patientData.oxygen_dependent === true || patientData.oxygen_dependent === "true",
      // Veterans status - send as boolean true/false
      veterans_status: patientData.veterans_status === "1" || patientData.veterans_status === true || patientData.veterans_status === "true" || patientData.veterans_status === 1 || false
    };
    
    // Remove old/incorrect field names that have been mapped to correct schema fields
    delete payload.genders; // Schema uses 'gender'
    
    // Primary diagnosis fields are handled correctly:
    // - primary_diagnosis_id is sent for custom diagnoses (has id)
    // - primary_diagnosis_code is sent for ICD10 codes (no id)
    // Description is not sent to backend
    if (payload.primary_diagnosis_description) {
      delete payload.primary_diagnosis_description;
    }
    
    // Race/Ethnicity fields - send arrays instead of race_ethnicity_id
    if (selectedRaces.length > 0) {
      payload.races = selectedRaces;
    }
    if (selectedEthnicities.length > 0) {
      payload.ethnicities = selectedEthnicities;
    }
    // Remove old race_ethnicity_id field if present
    delete payload.race_ethnicity_id;
    
    // Remove timestamp-like fields
    Object.keys(payload).forEach(key => {
      if (key.includes('_at') || key.includes('At')) {
        delete payload[key];
      }
      if (payload[key] === undefined || payload[key] === null) {
        delete payload[key];
      }
    });
    
    http
      .post('/patient', payload)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Patient Added',
          text: 'The patient has been added successfully!'
        });
        router.push(`/patients`);
      })
      .catch((error: any) => {
        setErrorMessage(error.response.data.errors);
      });
  };
  const handleCancel = () => {
    // Afficher une alerte SweetAlert pour confirmer l'annulation
    Swal.fire({
      icon: 'warning',
      title: 'Are you sure?',
      text: 'Any unsaved changes will be lost.',
      showCancelButton: true,
      confirmButtonText: 'Yes, cancel',
      cancelButtonText: 'No, go back'
    }).then((result) => {
      if (result.isConfirmed) {
        router.push(`/patients`);
      }
    });
  };

  // Fetch Primary Diagnosis List
  const fetchPrimaryDiagnosisList = async (searchQuery?: string) => {
    setPrimaryDiagnosisListLoading(true);
    try {
      const endpoint = searchQuery 
        ? `/primary-diagnosis/primaryDiagnosis/search?query=${encodeURIComponent(searchQuery)}`
        : `/primary-diagnosis/primaryDiagnosis/list`;
      
      const response = await http.get(endpoint);
      
      // Handle the response structure: { count, data, query } for search, or array for list
      const results = searchQuery 
        ? (response.data?.data || [])  // Search endpoint returns { count, data, query }
        : (Array.isArray(response.data) ? response.data : response.data?.results || []);
      
      // Map to our format: { code, description, id? }
      const mappedList = results.map((item: any) => ({
        code: item.code || item.diagnosis_code || '',
        description: item.description || item.diagnosis_description || '',
        id: item.id // Only present for custom diagnoses
      }));
      
      setPrimaryDiagnosisList(mappedList);
    } catch (error: any) {
      console.error('Error fetching primary diagnosis list:', error);
      if (error.response?.status === 401) {
        logout();
      }
      setPrimaryDiagnosisList([]);
    } finally {
      setPrimaryDiagnosisListLoading(false);
    }
  };
  const handleAddNewPrimaryDiagnosis = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Both code and description are required based on API spec
    if (!newPrimaryDiagnosis.code || !newPrimaryDiagnosis.description) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Both Code and Description are required'
      });
      return;
    }
    http
      .post('/primary-diagnosis/primaryDiagnosis/store', {
        diagnosis_code: newPrimaryDiagnosis.code,
        diagnosis_description: newPrimaryDiagnosis.description
      })
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Primary Diagnosis Added',
          text: response.data.message || 'Custom diagnosis added successfully'
        });
        setNewPrimaryDiagnosis({ code: '', description: '' });
        fetchPrimaryDiagnosisList(); // Refresh the list
        setOpenPrimaryDiagnosis(false);
      })
      .catch((error: any) => {
        if (error.response?.status === 422) {
          const errors = error.response.data.errors;
          const errorMessage = errors.diagnosis_code?.[0] || errors.diagnosis_description?.[0] || errors.code?.[0] || errors.description?.[0] || errors.name?.[0] || 'Validation error';
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || 'An error occurred while adding primary diagnosis'
          });
        }
      });
  };
  // new Patient Pharmacy
  const fetchPatientPharmacyData = async () => {
    http
      .get(`/patient/patientPharmacy`)
      .then((response: any) => {
        setPatientPharmacyData(response.data);
      })
      .catch((error: any) => {
        if(error?.response?.status === 401){
          logout();
        }
      });
  };
  const handleAddNewPatientPharmacy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    http
      .post('/patient/patientPharmacy/store', newPatientPharmacy)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Patient Pharmacy Added',
          text: response.data.message
        });
        fetchPatientPharmacyData();
      })
      .catch((error: any) => {
        if (error?.response?.status === 422) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response.data.errors.name
          });
        }
      });
    setOpenPatientPharmacy(false);
  };
  const handleDeletePatientPharmacy = async (pharmacyId: any) => {
    http
      .delete(`/patient/patientPharmacy/${pharmacyId}`)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'patient Pharmacy Delete',
          text: response.data.message
        });
        fetchPatientPharmacyData();
      })
      .catch((error: any) => {
        if (error?.response?.status === 422) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response.data.errors.name
          });
        } else  if(error?.response?.status === 401){
          logout();
        }
      });
  };
  // Fetch DME Provider Options
  const fetchDmeProviderData = async () => {
    http
      .get(`/dme-provider/providers`)
      .then((response: any) => {
        setDmeProviderData(response.data || []);
      })
      .catch((error: any) => { 
        if(error?.response?.status === 401){
          logout();
        }
      });
  };
  // new Liaison secondary
  const fetchLiaisonSecondaryData = async () => {
    http
      .get(`/liaison-secondary/liaisonSecondary`)
      .then((response: any) => {
        setLiaisonSecondaryData(response.data);
      })
      .catch((error: any) => { 
        if(error?.response?.status === 401){
        logout();
      }});
  };
  const handleAddNewLiaisonSecondary = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Trim and validate fields
    const trimmedFirstName = newLiaisonSecondary.first_name?.trim();
    const trimmedLastName = newLiaisonSecondary.last_name?.trim();
    const trimmedPhone = newLiaisonSecondary.phone?.trim();
    const trimmedEmail = newLiaisonSecondary.email?.trim();
    const trimmedRelationship = newLiaisonSecondary.relationship?.trim();
    
    // Ensure at least one field is provided
    if (!trimmedFirstName && !trimmedLastName && !trimmedPhone && !trimmedEmail && !trimmedRelationship) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'At least one field must be provided'
      });
      return;
    }
    
    // Build payload with only non-empty values
    const payload: { first_name?: string; last_name?: string; phone?: string; email?: string; relationship?: string } = {};
    if (trimmedFirstName) payload.first_name = trimmedFirstName;
    if (trimmedLastName) payload.last_name = trimmedLastName;
    if (trimmedPhone) payload.phone = trimmedPhone;
    if (trimmedEmail) payload.email = trimmedEmail;
    if (trimmedRelationship) payload.relationship = trimmedRelationship;
    
    http
      .post('/liaison-secondary/liaisonSecondary/store', payload)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Liaison Secondary Added',
          text: response.data.message
        });
        setNewLiaisonSecondary({ first_name: '', last_name: '', phone: '', email: '', relationship: '' });
        fetchLiaisonSecondaryData();
        setOpenLiaisonSecondary(false);
      })
      .catch((error: any) => {
        if (error.response?.status === 400 || error.response?.status === 422) {
          const errorMessage = error.response.data.error || error.response.data.message || 
            error.response.data.errors?.first_name?.[0] || 
            error.response.data.errors?.last_name?.[0] || 
            error.response.data.errors?.phone?.[0] || 
            error.response.data.errors?.email?.[0] || 
            error.response.data.errors?.relationship?.[0] || 
            'Validation error';
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || 'An error occurred while adding liaison secondary'
          });
        }
      });
  };
  const handleDeleteLiaisonSecondary = async (secondaryId: any) => {
    http
      .delete(`/liaison-secondary/liaisonSecondary/${secondaryId}`)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Liaison Secondary Delete',
          text: response.data.message
        });
        fetchLiaisonSecondaryData();
      })
      .catch((error: any) => {
        if (error?.response?.status === 422) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response.data.errors.name
          });
        }else  if(error?.response?.status === 401){
          logout();
        }
      });
  };
  // new Liaison primary
  const fetchLiaisonPrimaryData = async () => {
    http
      .get(`/liaison-primary/liaisonPrimary`)
      .then((response: any) => {
        setLiaisonPrimaryData(response.data);
      })
      .catch((error: any) => {
        if(error?.response?.status === 401){
          logout();
        }
      });
  };
  const handleAddNewLiaisonPrimary = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Trim and validate fields
    const trimmedFirstName = newLiaisonPrimary.first_name?.trim();
    const trimmedLastName = newLiaisonPrimary.last_name?.trim();
    const trimmedPhone = newLiaisonPrimary.phone?.trim();
    const trimmedEmail = newLiaisonPrimary.email?.trim();
    const trimmedRelationship = newLiaisonPrimary.relationship?.trim();
    
    // Ensure at least one field is provided
    if (!trimmedFirstName && !trimmedLastName && !trimmedPhone && !trimmedEmail && !trimmedRelationship) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'At least one field must be provided'
      });
      return;
    }
    
    // Build payload with only non-empty values
    const payload: { first_name?: string; last_name?: string; phone?: string; email?: string; relationship?: string } = {};
    if (trimmedFirstName) payload.first_name = trimmedFirstName;
    if (trimmedLastName) payload.last_name = trimmedLastName;
    if (trimmedPhone) payload.phone = trimmedPhone;
    if (trimmedEmail) payload.email = trimmedEmail;
    if (trimmedRelationship) payload.relationship = trimmedRelationship;
    
    http
      .post('/liaison-primary/liaisonPrimary/store', payload)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Liaison Primary Added',
          text: response.data.message
        });
        setNewLiaisonPrimary({ first_name: '', last_name: '', phone: '', email: '', relationship: '' });
        fetchLiaisonPrimaryData();
        setOpenLiaisonPrimary(false);
      })
      .catch((error: any) => {
        if (error.response?.status === 400 || error.response?.status === 422) {
          const errorMessage = error.response.data.error || error.response.data.message || 
            error.response.data.errors?.first_name?.[0] || 
            error.response.data.errors?.last_name?.[0] || 
            error.response.data.errors?.phone?.[0] || 
            error.response.data.errors?.email?.[0] || 
            error.response.data.errors?.relationship?.[0] || 
            'Validation error';
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || 'An error occurred while adding liaison primary'
          });
        }
      });
  };
  const handleDeleteLiaisonPrimary = async (primaryId: any) => {
    http
      .delete(`/liaison-primary/liaisonPrimary/${primaryId}`)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Liaison Primary Delete',
          text: response.data.message
        });
        fetchLiaisonPrimaryData();
      })
      .catch((error: any) => {
        if (error?.response?.status === 422) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response.data.errors.name
          });
        }
      });
  };
  // new  dnr
  const fetchDNRData = async () => {
    http
      .get(`/dnr/dnr`)
      .then((response: any) => {
        setDnrData(response.data);
      })
      .catch((error: any) => {
        if(error?.response?.status === 401){
          logout();
        }
      });
  };
  const handleAddNewDNR = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Ensure at least one field is provided
    if (!newDnr.dnr_status && !newDnr.dnr_date && !newDnr.dnr_notes) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'At least one of Status, Date, or Notes must be provided'
      });
      return;
    }
    http
      .post('/dnr/dnr/store', {
        dnr_status: newDnr.dnr_status || undefined,
        dnr_date: newDnr.dnr_date || undefined,
        dnr_notes: newDnr.dnr_notes || undefined
      })
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'DNR Added',
          text: response.data.message
        });
        setNewDnr({ dnr_status: '', dnr_date: '', dnr_notes: '' });
        fetchDNRData();
        setOpenDnr(false);
      })
      .catch((error: any) => {
        if (error.response?.status === 400 || error.response?.status === 422) {
          const errorMessage = error.response.data.error || error.response.data.message || 
            error.response.data.errors?.dnr_status?.[0] || 
            error.response.data.errors?.dnr_date?.[0] || 
            error.response.data.errors?.dnr_notes?.[0] || 
            'Validation error';
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || 'An error occurred while adding DNR'
          });
        }
      });
  };
  const handleDeleteDNR = async (dnrId: any) => {
    http
      .delete(`/dnr/dnr/${dnrId}`)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'DNR Delete',
          text: response.data.message
        });
        fetchDNRData();
      })
      .catch((error: any) => {
        if (error?.response?.status === 422) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response.data.errors.name
          });
        }
      });
  };

  // new  Emergency Preparedness Level
  const fetchEmergencyPreparednessLevelData = async () => {
    http
      .get(`/emergency-preparedness-level/emergencyPreparednessLevel`)
      .then((response: any) => {
        setEmergencyPreparednessLevelData(response.data);
      })
      .catch((error: any) => {
        if(error?.response?.status === 401){
          logout();
        }
      });
  };
  const handleAddNewEmergencyPreparednessLevel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Trim and validate fields
    const trimmedLevel = newEmergencyPreparednessLevel.level?.trim();
    const trimmedDescription = newEmergencyPreparednessLevel.description?.trim();
    
    // Ensure at least one field is provided
    if (!trimmedLevel && !trimmedDescription) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'At least one of Level or Description must be provided'
      });
      return;
    }
    
    // Build payload with only non-empty values
    const payload: { level?: string; description?: string } = {};
    if (trimmedLevel) payload.level = trimmedLevel;
    if (trimmedDescription) payload.description = trimmedDescription;
    
    http
      .post('/emergency-preparedness-level/emergencyPreparednessLevel/store', payload)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Emergency Preparedness Level Added',
          text: response.data.message
        });
        setNewEmergencyPreparednessLevel({ level: '', description: '' });
        fetchEmergencyPreparednessLevelData();
        setOpenEmergencyPreparednessLevel(false);
      })
      .catch((error: any) => {
        if (error.response?.status === 400 || error.response?.status === 422) {
          const errorMessage = error.response.data.error || error.response.data.message || 
            error.response.data.errors?.level?.[0] || 
            error.response.data.errors?.description?.[0] || 
            'Validation error';
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response?.data?.message || 'An error occurred while adding emergency preparedness level'
          });
        }
      });
  };
  const handleDeleteEmergencyPreparednessLevel = async (emergencyPreparednessLevelId: any) => {
    http
      .delete(`/emergency-preparedness-level/emergencyPreparednessLevel/${emergencyPreparednessLevelId}`)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'emergency Preparedness Level Delete',
          text: response.data.message
        });
        fetchEmergencyPreparednessLevelData();
      })
      .catch((error: any) => {
        if (error?.response?.status === 422) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response.data.errors.name
          });
        }else  if(error?.response?.status === 401){
          logout();
        }
      });
  };
  // Fetch race/ethnicity options from the new endpoint
  const fetchRaceEthnicityOptions = async () => {
    setRaceEthnicityOptionsLoading(true);
    try {
      const response = await http.get('/race-ethnicity/raceEthnicity/options');
      setRaceEthnicityOptions(response.data);
    } catch (error: any) {
      console.error('Error fetching race/ethnicity options:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setRaceEthnicityOptionsLoading(false);
    }
  };

  // Legacy function - kept for backward compatibility if needed elsewhere
  const fetchRaceEthnicityData = async () => {
    http
      .get(`/patient/raceEthnicity`)
      .then((response: any) => {
        setRaceEthnicityData(response.data);
      })
      .catch((error: any) => {
        if(error?.response?.status === 401){
          logout();
        }
      });
  };
  const handleAddNewRaceEthnicity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Ensure at least race is provided
    if (!newRaceEthnicity.race && !newRaceEthnicity.ethnicity) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'At least one of Race or Ethnicity must be provided'
      });
      return;
    }
    http
      .post('/patient/raceEthnicity/store', {
        race: newRaceEthnicity.race,
        ethnicity: newRaceEthnicity.ethnicity
      })
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Race Ethnicity Added',
          text: response.data.message
        });
        setNewRaceEthnicity({ race: '', ethnicity: '' });
        fetchRaceEthnicityData();
        setOpenRaceEthnicity(false);
      })
      .catch((error: any) => {
        if (error.response?.status === 422) {
          const errors = error.response.data.errors;
          const errorMessage = errors.race?.[0] || errors.ethnicity?.[0] || 'Validation error';
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while adding race/ethnicity'
          });
        }
      });
  };
  const handleDeleteRaceEthnicity = async (raceEthnicityId: any) => {
    http
      .delete(`/patient/raceEthnicity/${raceEthnicityId}`)
      .then((response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Race Ethnicity Delete',
          text: response.data.message
        });
        fetchRaceEthnicityData();
      })
      .catch((error: any) => {
        if (error?.response?.status === 422) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.response.data.errors.name
          });
        }else  if(error?.response?.status === 401){
          logout();
        }
      });
  };

  useEffect(() => {
    fetchPrimaryDiagnosisList();
    fetchPatientPharmacyData();
    fetchDmeProviderData();
    fetchLiaisonSecondaryData();
    fetchLiaisonSecondaryData();
    fetchLiaisonPrimaryData();
    fetchDNRData();
    fetchRaceEthnicityData();
    fetchRaceEthnicityOptions();
    fetchEmergencyPreparednessLevelData();
  }, []);

  // Debounce search query for Primary Diagnosis
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (primaryDiagnosisSearchQuery.trim()) {
        fetchPrimaryDiagnosisList(primaryDiagnosisSearchQuery);
      } else if (primaryDiagnosisSearchQuery === '') {
        // Only fetch full list if search was cleared
        fetchPrimaryDiagnosisList();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [primaryDiagnosisSearchQuery]);

  const handleCloseModal = () => {
    setOpenPrimaryDiagnosis(false);
    setOpenPatientPharmacy(false);
    setOpenLiaisonPrimary(false);
    setOpenLiaisonSecondary(false);
    setOpenDnr(false);
    setOpenRaceEthnicity(false);
    setOpenEmergencyPreparednessLevel(false);
  };
  return (
    <>
      <MainCard title="General Information">
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="Firsname">
                  First Name <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <TextField
                  fullWidth
                  id="Firsname"
                  placeholder="Firsname"
                  name="first_name"
                  autoFocus
                  value={patientData.first_name}
                  onChange={handleChange}
                />
                {errorMessage.first_name && <span style={{ color: 'red' }}>{errorMessage.first_name}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="lastName">
                  Last Name <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <TextField
                  fullWidth
                  id="lastName"
                  placeholder="Last Name"
                  name="last_name"
                  value={patientData.last_name}
                  onChange={handleChange}
                />{' '}
                {errorMessage.last_name && <span style={{ color: 'red' }}>{errorMessage.last_name}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={1}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="mi">
                  MI <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <TextField fullWidth id="mi" placeholder="MI" autoFocus name="mi" value={patientData.mi} onChange={handleChange} />{' '}
                {errorMessage.mi && <span style={{ color: 'red' }}>{errorMessage.mi}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="suffix">
                  Suffix <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <TextField fullWidth id="suffix" placeholder="Suffix" name="suffix" value={patientData.suffix} onChange={handleChange} />{' '}
                {errorMessage.suffix && <span style={{ color: 'red' }}>{errorMessage.suffix}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="Preferred">
                  Preferred Name <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <TextField
                  fullWidth
                  id="Preferred"
                  placeholder="Preferred Name"
                  name="preferred_name"
                  autoFocus
                  value={patientData.preferred_name}
                  onChange={handleChange}
                />{' '}
                {errorMessage.preferred_name && <span style={{ color: 'red' }}>{errorMessage.preferred_name}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="birth">
                  Date Of Birth <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <TextField
                  fullWidth
                  id="birth"
                  placeholder="Date of  birth"
                  name="date_of_birth"
                  type="date"
                  value={patientData.date_of_birth}
                  onChange={handleChange}
                />
                {errorMessage.date_of_birth && <span style={{ color: 'red' }}>{errorMessage.date_of_birth}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="ssn">
                  SSN <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <TextField 
                  fullWidth 
                  id="ssn" 
                  placeholder="xxx-xx-xxxx" 
                  name="ssn" 
                  value={patientData.ssn || ''} 
                  onChange={handleChange}
                  inputProps={{
                    maxLength: 11, // xxx-xx-xxxx = 11 characters
                    pattern: '[0-9]{3}-[0-9]{2}-[0-9]{4}'
                  }}
                />{' '}
                {errorMessage.ssn && <span style={{ color: 'red' }}>{errorMessage.ssn}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="Consents">
                  Patient Consents <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <Select
                  fullWidth
                  id="received"
                  value={selected.patient_consents || ''}
                  onChange={(event: any) => {
                    const selectedId = event.target.value;
                    setSelected((prevSelected) => ({
                      ...prevSelected,
                      patient_consents: selectedId
                    }));
                    setPatientData((prevPatientData: any) => ({
                      ...prevPatientData,
                      patient_consents: selectedId
                    }));
                  }}
                >
                  <MenuItem value="1">Yes</MenuItem>
                  <MenuItem value="0">No</MenuItem>
                </Select>
                {errorMessage.patient_consents_id && <span style={{ color: 'red' }}>{errorMessage.patient_consents_id}</span>}
              </Stack>
            </Grid>{' '}
            <Grid item xs={12} sm={6} md={2}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="received">
                  HIPAA received <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <Select
                  fullWidth
                  id="received"
                  value={selected.hipaa_received || ''}
                  onChange={(event: any) => {
                    const selectedId = event.target.value;
                    setSelected((prevSelected) => ({
                      ...prevSelected,
                      hipaa_received: selectedId
                    }));
                    setPatientData((prevPatientData: any) => ({
                      ...prevPatientData,
                      hipaa_received: selectedId
                    }));
                  }}
                >
                  <MenuItem value="1">Yes</MenuItem>
                  <MenuItem value="0">No</MenuItem>
                </Select>
                {errorMessage.hipaa_received_id && <span style={{ color: 'red' }}>{errorMessage.hipaa_received_id}</span>}
              </Stack>
            </Grid>{' '}
            <Grid item xs={12} sm={6} md={2}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="dnr">
                  DNR <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <Select
                  fullWidth
                  id="dnr"
                  value={selected.dnr_id || ''}
                  onChange={(event: any) => {
                    const selectedId = event.target.value;
                    setSelected((prevSelected) => ({
                      ...prevSelected,
                      dnr_id: selectedId
                    }));
                    setPatientData((prevPatientData: any) => ({
                      ...prevPatientData,
                      dnr_id: selectedId
                    }));
                  }}
                >
                  <MenuItem onClick={handleOpenDnr}>
                    <AddCircle size="32" color="#0B5F24" />
                  </MenuItem>
                  {dnrData.map((dnr, index) => {
                    // Handle backend format (dnr_status, dnr_date, dnr_notes) and display format (name)
                    const status = dnr.dnr_status || '';
                    const date = dnr.dnr_date ? new Date(dnr.dnr_date).toLocaleDateString() : '';
                    const notes = dnr.dnr_notes || '';
                    const displayParts = [status, date, notes].filter(Boolean);
                    const displayText = displayParts.length > 0 
                      ? displayParts.join(' - ') 
                      : dnr.name || 'N/A';
                    return (
                      <MenuItem key={index} value={dnr.id}>
                        <Grid container alignItems="center" justifyContent="space-between" sx={{ width: '100%', py: 0.5 }}>
                          <Grid item xs>
                            <Typography variant="body2" sx={{ pr: 2 }}>
                              {displayText}
                            </Typography>
                          </Grid>
                          <Grid item>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDNR(dnr.id);
                              }}
                              sx={{ 
                                padding: '4px',
                                '&:hover': { 
                                  backgroundColor: 'error.lighter',
                                  borderRadius: '4px'
                                }
                              }}
                            >
                              <Trash size="18" color="#FF3C00" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </MenuItem>
                    );
                  })}
                </Select>
                {errorMessage.dnr_id && <span style={{ color: 'red' }}>{errorMessage.dnr_id}</span>}
              </Stack>
            </Grid>{' '}
            <Grid item xs={12} sm={6} md={2}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="diagnosis">
                  Primary Diagnosis <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <Autocomplete
                  fullWidth
                  id="diagnosis"
                  options={primaryDiagnosisList}
                  loading={primaryDiagnosisListLoading}
                  value={selectedPrimaryDiagnosis}
                  openOnFocus={true}
                  onFocus={() => {
                    if (primaryDiagnosisList.length === 0) {
                      fetchPrimaryDiagnosisList();
                    }
                  }}
                  onChange={(event, newValue) => {
                    if (newValue) {
                      setSelectedPrimaryDiagnosis(newValue);
                      // If custom diagnosis (has id), use primary_diagnosis_id, otherwise use primary_diagnosis_code
                      if (newValue.id) {
                        // Custom diagnosis - use id
                        setPatientData((prevPatientData: any) => ({
                          ...prevPatientData,
                          primary_diagnosis_id: newValue.id,
                          primary_diagnosis_code: undefined,
                          primary_diagnosis_description: undefined
                        }));
                      } else {
                        // ICD10 code - use primary_diagnosis_code
                        setPatientData((prevPatientData: any) => ({
                          ...prevPatientData,
                          primary_diagnosis_id: undefined,
                          primary_diagnosis_code: newValue.code,
                          primary_diagnosis_description: undefined
                        }));
                      }
                    } else {
                      setSelectedPrimaryDiagnosis(null);
                      setPatientData((prevPatientData: any) => ({
                        ...prevPatientData,
                        primary_diagnosis_id: undefined,
                        primary_diagnosis_code: undefined,
                        primary_diagnosis_description: undefined
                      }));
                    }
                  }}
                  onInputChange={(event, newInputValue) => {
                    setPrimaryDiagnosisSearchQuery(newInputValue);
                  }}
                  filterOptions={(options, { inputValue }) => {
                    // Client-side filtering as fallback
                    const searchValue = inputValue.toLowerCase().trim();
                    if (!searchValue) return options;
                    return options.filter((option) => {
                      const codeMatch = option.code?.toLowerCase().includes(searchValue);
                      const descMatch = option.description?.toLowerCase().includes(searchValue);
                      return codeMatch || descMatch;
                    });
                  }}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option ? `${option.code} - ${option.description}` : '';
                  }}
                  isOptionEqualToValue={(option, value) => {
                    if (!option || !value) return false;
                    return option.code === value.code && (option.id === value.id || (!option.id && !value.id));
                  }}
                  renderOption={(props, option) => (
                    <li {...props} key={option.code || option.id}>
                      <Typography variant="body2">
                        <strong>{option.code}</strong> - {option.description}
                      </Typography>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Search or select diagnosis..."
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <React.Fragment>
                            {primaryDiagnosisListLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </React.Fragment>
                        ),
                      }}
                    />
                  )}
                  noOptionsText={
                    <Stack direction="column" spacing={1} alignItems="center" sx={{ p: 1 }}>
                      <Typography variant="body2">No results found</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddCircle size={18} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPrimaryDiagnosis();
                        }}
                      >
                        Add Custom Diagnosis
                      </Button>
                    </Stack>
                  }
                  freeSolo={false}
                />
                {errorMessage.primary_diagnosis_id && <span style={{ color: 'red' }}>{errorMessage.primary_diagnosis_id}</span>}
              </Stack>
            </Grid>{' '}
            <Grid item xs={12} sm={6} md={2}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="Gender">
                  Gender <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <Select
                  fullWidth
                  id="Gender"
                  name="gender"
                  value={selected.gender || ''}
                  onChange={(event: any) => {
                    const selectedId = event.target.value;
                    setSelected((prevSelected) => ({
                      ...prevSelected,
                      gender: selectedId
                    }));
                    setPatientData((prevPatientData: any) => ({
                      ...prevPatientData,
                      gender: selectedId
                    }));
                  }}
                >
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="male">Male</MenuItem>
                </Select>
                {errorMessage.gender && <span style={{ color: 'red' }}>{errorMessage.gender}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="oxygen">
                  Oxygen Dependent <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <Select
                  fullWidth
                  id="oxygen"
                  value={selected.oxygen_dependent || ''}
                  onChange={(event: any) => {
                    const selectedId = event.target.value;
                    setSelected((prevSelected) => ({
                      ...prevSelected,
                      oxygen_dependent: selectedId
                    }));
                    setPatientData((prevPatientData: any) => ({
                      ...prevPatientData,
                      oxygen_dependent: selectedId
                    }));
                  }}
                >
                  <MenuItem value="1">Yes</MenuItem>
                  <MenuItem value="0">No</MenuItem>
                </Select>
                {errorMessage.oxygen_dependent && <span style={{ color: 'red' }}>{errorMessage.oxygen_dependent}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="veterans_status">
                  Veterans Status <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <Select
                  fullWidth
                  id="veterans_status"
                  value={selected.veterans_status || ''}
                  onChange={(event: any) => {
                    const selectedId = event.target.value;
                    setSelected((prevSelected) => ({
                      ...prevSelected,
                      veterans_status: selectedId
                    }));
                    setPatientData((prevPatientData: any) => ({
                      ...prevPatientData,
                      veterans_status: selectedId
                    }));
                  }}
                >
                  <MenuItem value="1">Yes</MenuItem>
                  <MenuItem value="0">No</MenuItem>
                </Select>
                {errorMessage.veterans_status && <span style={{ color: 'red' }}>{errorMessage.veterans_status}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="Pharmacy">
                  Patient Pharmacy <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <Select
                  fullWidth
                  id="Pharmacy"
                  value={selected.patient_pharmacy_id || ''}
                  onChange={(event: any) => {
                    const selectedId = event.target.value;
                    setSelected((prevSelected) => ({
                      ...prevSelected,
                      patient_pharmacy_id: selectedId
                    }));
                    setPatientData((prevPatientData: any) => ({
                      ...prevPatientData,
                      patient_pharmacy_id: selectedId
                    }));
                  }}
                >
                  <MenuItem onClick={handleOpenPatientPharmacy}>
                    <AddCircle size="32" color="#0B5F24" />
                  </MenuItem>
                  {patientPharmacyData.map((pharmacy, index) => (
                    <MenuItem key={index} value={pharmacy.id}>
                      {pharmacy.name}
                      <ListItemSecondaryAction>
                        <ListItemIcon>
                          <Trash size="22" color="#FF3C00" onClick={() => handleDeletePatientPharmacy(pharmacy.id)} />
                        </ListItemIcon>
                      </ListItemSecondaryAction>
                    </MenuItem>
                  ))}
                </Select>
                {errorMessage.patient_pharmacy_id && <span style={{ color: 'red' }}>{errorMessage.patient_pharmacy_id}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="raceEthnicity">
                  Race / Ethnicity <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                {raceEthnicityOptionsLoading ? (
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      py: 4,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <CircularProgress size={32} sx={{ mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Loading race and ethnicity options...
                    </Typography>
                  </Box>
                ) : raceEthnicityOptions ? (
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: errorMessage.race_ethnicity_id ? 'error.main' : 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Standard Races Section */}
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary' }}>
                        Race (select all that apply)
                      </Typography>
                      <FormGroup>
                        {raceEthnicityOptions.races && raceEthnicityOptions.races.length > 0 ? (
                          raceEthnicityOptions.races.map((race) => (
                            <FormControlLabel
                              key={race}
                              control={
                                <Checkbox
                                  checked={selectedRaces.includes(race)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRaces([...selectedRaces, race]);
                                    } else {
                                      setSelectedRaces(selectedRaces.filter((r) => r !== race));
                                    }
                                  }}
                                  size="small"
                                  sx={{ py: 0.5 }}
                                />
                              }
                              label={<Typography variant="body2">{race}</Typography>}
                              sx={{ mb: 0.5 }}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No standard race options available
                          </Typography>
                        )}
                      </FormGroup>
                    </Box>

                    {/* Detailed Races Section - Collapsible */}
                    {raceEthnicityOptions.detailedRaces && raceEthnicityOptions.detailedRaces.length > 0 && (
                      <Accordion 
                        expanded={detailedRacesExpanded}
                        onChange={(event, isExpanded) => setDetailedRacesExpanded(isExpanded)}
                        sx={{ 
                          boxShadow: 'none',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          '&:before': { display: 'none' }
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ArrowDown2 size={20} style={{ transform: detailedRacesExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />}
                          sx={{
                            px: 2,
                            py: 1,
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Detailed Race Options ({raceEthnicityOptions.detailedRaces.length} options)
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 2, pb: 2, pt: 0, maxHeight: '300px', overflowY: 'auto' }}>
                          <FormGroup>
                            {raceEthnicityOptions.detailedRaces.map((race) => (
                              <FormControlLabel
                                key={race}
                                control={
                                  <Checkbox
                                    checked={selectedRaces.includes(race)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedRaces([...selectedRaces, race]);
                                      } else {
                                        setSelectedRaces(selectedRaces.filter((r) => r !== race));
                                      }
                                    }}
                                    size="small"
                                    sx={{ py: 0.5 }}
                                  />
                                }
                                label={<Typography variant="body2">{race}</Typography>}
                                sx={{ mb: 0.5 }}
                              />
                            ))}
                          </FormGroup>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {/* Ethnicities Section */}
                    <Box sx={{ p: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary' }}>
                        Ethnicity (select all that apply)
                      </Typography>
                      <FormGroup>
                        {raceEthnicityOptions.ethnicities && raceEthnicityOptions.ethnicities.length > 0 ? (
                          raceEthnicityOptions.ethnicities.map((ethnicity) => (
                            <FormControlLabel
                              key={ethnicity}
                              control={
                                <Checkbox
                                  checked={selectedEthnicities.includes(ethnicity)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedEthnicities([...selectedEthnicities, ethnicity]);
                                    } else {
                                      setSelectedEthnicities(selectedEthnicities.filter((e) => e !== ethnicity));
                                    }
                                  }}
                                  size="small"
                                  sx={{ py: 0.5 }}
                                />
                              }
                              label={<Typography variant="body2">{ethnicity}</Typography>}
                              sx={{ mb: 0.5 }}
                            />
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            No ethnicity options available
                          </Typography>
                        )}
                      </FormGroup>
                    </Box>

                    {/* Selected items display */}
                    {(selectedRaces.length > 0 || selectedEthnicities.length > 0) && (
                      <Box 
                        sx={{ 
                          mt: 0, 
                          pt: 2, 
                          pb: 2,
                          px: 2,
                          borderTop: '1px solid', 
                          borderColor: 'divider',
                          bgcolor: 'action.hover'
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1, color: 'text.primary' }}>
                          Selected Items:
                        </Typography>
                        {selectedRaces.length > 0 && (
                          <Box sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', color: 'text.secondary', mb: 0.25 }}>
                              Race:
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'primary.main', ml: 1 }}>
                              {selectedRaces.join(', ')}
                            </Typography>
                          </Box>
                        )}
                        {selectedEthnicities.length > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 500, display: 'block', color: 'text.secondary', mb: 0.25 }}>
                              Ethnicity:
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'primary.main', ml: 1 }}>
                              {selectedEthnicities.join(', ')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box 
                    sx={{ 
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 3,
                      textAlign: 'center',
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Unable to load options. Please refresh the page.
                    </Typography>
                  </Box>
                )}
                {errorMessage.race_ethnicity_id && <span style={{ color: 'red' }}>{errorMessage.race_ethnicity_id}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="Provider">
                  DME Provider <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <Select
                  fullWidth
                  id="Provider"
                  value={selected.dme_provider || ''}
                  onChange={(event: any) => {
                    const selectedValue = event.target.value;
                    setSelected((prevSelected) => ({
                      ...prevSelected,
                      dme_provider: selectedValue
                    }));
                    setPatientData((prevPatientData: any) => ({
                      ...prevPatientData,
                      dme_provider: selectedValue
                    }));
                  }}
                >
                  {dmeProviderData.map((option, index) => (
                    <MenuItem key={index} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {errorMessage.dme_provider && <span style={{ color: 'red' }}>{errorMessage.dme_provider}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="primary">
                  Liaison (primary) <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <Select
                  fullWidth
                  id="primary"
                  value={selected.liaison_primary_id || ''}
                  onChange={(event: any) => {
                    const selectedId = event.target.value;
                    setSelected((prevSelected) => ({
                      ...prevSelected,
                      liaison_primary_id: selectedId
                    }));
                    setPatientData((prevPatientData: any) => ({
                      ...prevPatientData,
                      liaison_primary_id: selectedId
                    }));
                  }}
                >
                  <MenuItem onClick={handleOpenLiaisonPrimary}>
                    <AddCircle size="32" color="#0B5F24" />{' '}
                  </MenuItem>
                  {liaisonPrimaryData.map((primary, index) => {
                    // Display first_name, last_name, phone, email, relationship if available
                    const displayParts = [
                      primary.first_name,
                      primary.last_name,
                      primary.phone,
                      primary.email,
                      primary.relationship
                    ].filter(Boolean);
                    const displayText = displayParts.length > 0 
                      ? displayParts.join(' - ') 
                      : 'N/A';
                    return (
                      <MenuItem key={index} value={primary.id}>
                        <Grid container alignItems="center" justifyContent="space-between" sx={{ width: '100%', py: 0.5 }}>
                          <Grid item xs>
                            <Typography variant="body2" sx={{ pr: 2 }}>
                              {displayText}
                            </Typography>
                          </Grid>
                          <Grid item>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLiaisonPrimary(primary.id);
                              }}
                              sx={{ 
                                padding: '4px',
                                '&:hover': { 
                                  backgroundColor: 'error.lighter',
                                  borderRadius: '4px'
                                }
                              }}
                            >
                              <Trash size="18" color="#FF3C00" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </MenuItem>
                    );
                  })}
                </Select>
                {errorMessage.liaison_secondary_id && <span style={{ color: 'red' }}>{errorMessage.liaison_primary_id}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="secondary">
                  Liaison (secondary) <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <Select
                  fullWidth
                  id="secondary"
                  value={selected.liaison_secondary_id || ''}
                  onChange={(event: any) => {
                    const selectedId = event.target.value;
                    setSelected((prevSelected) => ({
                      ...prevSelected,
                      liaison_secondary_id: selectedId
                    }));
                    setPatientData((prevPatientData: any) => ({
                      ...prevPatientData,
                      liaison_secondary_id: selectedId
                    }));
                  }}
                >
                  <MenuItem onClick={handleOpenLiaisonSecondary}>
                    <AddCircle size="32" color="#0B5F24" />
                  </MenuItem>
                  {liaisonSecondaryData.map((secondary, index) => {
                    // Display first_name, last_name, phone, email, relationship if available
                    const displayParts = [
                      secondary.first_name,
                      secondary.last_name,
                      secondary.phone,
                      secondary.email,
                      secondary.relationship
                    ].filter(Boolean);
                    const displayText = displayParts.length > 0 
                      ? displayParts.join(' - ') 
                      : 'N/A';
                    return (
                      <MenuItem key={index} value={secondary.id}>
                        <Grid container alignItems="center" justifyContent="space-between" sx={{ width: '100%', py: 0.5 }}>
                          <Grid item xs>
                            <Typography variant="body2" sx={{ pr: 2 }}>
                              {displayText}
                            </Typography>
                          </Grid>
                          <Grid item>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLiaisonSecondary(secondary.id);
                              }}
                              sx={{ 
                                padding: '4px',
                                '&:hover': { 
                                  backgroundColor: 'error.lighter',
                                  borderRadius: '4px'
                                }
                              }}
                            >
                              <Trash size="18" color="#FF3C00" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </MenuItem>
                    );
                  })}
                </Select>
                {errorMessage.liaison_secondary_id && <span style={{ color: 'red' }}>{errorMessage.liaison_secondary_id}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="emergecy">
                  Emergecy Preparedness Level <span style={{ color: 'red' }}>*</span>
                </InputLabel>
                <Select
                  fullWidth
                  id="secondary"
                  value={selected.emergency_preparedness_level_id || ''}
                  onChange={(event: any) => {
                    const selectedId = event.target.value;
                    setSelected((prevSelected) => ({
                      ...prevSelected,
                      emergency_preparedness_level_id: selectedId
                    }));
                    setPatientData((prevPatientData: any) => ({
                      ...prevPatientData,
                      emergency_preparedness_level_id: selectedId
                    }));
                  }}
                >
                  <MenuItem onClick={handleOpenEmergencyPreparednessLevel}>
                    <AddCircle size="32" color="#0B5F24" />
                  </MenuItem>
                  {emergencyPreparednessData.map((emergencyPreparedness, index) => {
                    // Display level and description if available
                    const displayParts = [emergencyPreparedness.level, emergencyPreparedness.description].filter(Boolean);
                    const displayText = displayParts.length > 0 
                      ? displayParts.join(' - ') 
                      : emergencyPreparedness.name || 'N/A';
                    return (
                      <MenuItem key={index} value={emergencyPreparedness.id}>
                        <Grid container alignItems="center" justifyContent="space-between" sx={{ width: '100%', py: 0.5 }}>
                          <Grid item xs>
                            <Typography variant="body2" sx={{ pr: 2 }}>
                              {displayText}
                            </Typography>
                          </Grid>
                          <Grid item>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEmergencyPreparednessLevel(emergencyPreparedness.id);
                              }}
                              sx={{ 
                                padding: '4px',
                                '&:hover': { 
                                  backgroundColor: 'error.lighter',
                                  borderRadius: '4px'
                                }
                              }}
                            >
                              <Trash size="18" color="#FF3C00" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </MenuItem>
                    );
                  })}
                </Select>
                {errorMessage.emergency_preparedness_level_id && (
                  <span style={{ color: 'red' }}>{errorMessage.emergency_preparedness_level_id}</span>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="date_of_referral">
                  Date of Referral
                </InputLabel>
                <TextField
                  fullWidth
                  id="date_of_referral"
                  placeholder="Date of Referral"
                  name="date_of_referral"
                  type="date"
                  value={patientData.date_of_referral}
                  onChange={handleChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
                {errorMessage.date_of_referral && <span style={{ color: 'red' }}>{errorMessage.date_of_referral}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="who_took_referral">
                  Who Took Referral
                </InputLabel>
                <TextField
                  fullWidth
                  id="who_took_referral"
                  placeholder="Who Took Referral"
                  name="who_took_referral"
                  value={patientData.who_took_referral}
                  onChange={handleChange}
                />
                {errorMessage.who_took_referral && <span style={{ color: 'red' }}>{errorMessage.who_took_referral}</span>}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="referral_source">
                  Referral Source
                </InputLabel>
                <Select
                  fullWidth
                  id="referral_source"
                  name="referral_source"
                  value={patientData.referral_source || ''}
                  onChange={(event: any) => {
                    const value = event.target.value;
                    setPatientData((prevPatientData: any) => ({
                      ...prevPatientData,
                      referral_source: value,
                      // Clear referral_source_other if not "Other"
                      referral_source_other: value === 'Other' ? prevPatientData.referral_source_other : ''
                    }));
                  }}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Hospital">Hospital</MenuItem>
                  <MenuItem value="Doctor office">Doctor office</MenuItem>
                  <MenuItem value="Family">Family</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
                {errorMessage.referral_source && <span style={{ color: 'red' }}>{errorMessage.referral_source}</span>}
              </Stack>
            </Grid>
            {patientData.referral_source === 'Other' && (
              <Grid item xs={12} sm={6} md={4}>
                <Stack spacing={1.25}>
                  <InputLabel htmlFor="referral_source_other">
                    Referral Source Other
                  </InputLabel>
                  <TextField
                    fullWidth
                    id="referral_source_other"
                    placeholder="Referral Source Other"
                    name="referral_source_other"
                    value={patientData.referral_source_other}
                    onChange={handleChange}
                  />
                  {errorMessage.referral_source_other && <span style={{ color: 'red' }}>{errorMessage.referral_source_other}</span>}
                </Stack>
              </Grid>
            )}
          </Grid>
          <Grid item xs={12} sx={{ mt: 3 }}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button variant="outlined" color="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="contained" type="submit">
                Add patient
              </Button>
            </Stack>
          </Grid>
        </form>

        {/* Modal pour ajouter un nouveau PrimaryDiagnosisData */}
        <Modal
          aria-labelledby="unstyled-modal-title"
          aria-describedby="unstyled-modal-diagnosis"
          open={openPrimaryDiagnosis}
          onClose={handleClosePrimaryDiagnosis}
        >
           <MainCard title="Add New Primary Diagnosis" modal darkTitle content={false}> 
          <CardContent sx={{ width: 400 }}>
              <form onSubmit={handleAddNewPrimaryDiagnosis}>
                <TextField
                  label="Code *"
                  value={newPrimaryDiagnosis.code || ''}
                  name="code"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewPrimaryDiagnosis({ ...newPrimaryDiagnosis, code: e.target.value })}
                  required
                  helperText="Diagnosis code (e.g., I10, E11)"
                />
                <TextField
                  label="Description *"
                  value={newPrimaryDiagnosis.description || ''}
                  name="description"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewPrimaryDiagnosis({ ...newPrimaryDiagnosis, description: e.target.value })}
                  multiline
                  rows={3}
                  required
                  helperText="Full description of the diagnosis"
                />
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                  <Button variant="contained" type="submit">
                    Add
                  </Button>
                  <Button onClick={handleCloseModal} style={{ marginLeft: '10px' }}>
                    Cancel
                  </Button>
                </div>
              </form>
          </CardContent>
            </MainCard>
        </Modal>
        {/* Modal pour ajouter un nouveau Add New Patient Pharmacy */}
        <Modal
          aria-labelledby="unstyled-modal-title"
          aria-describedby="unstyled-modal-diagnosis"
          open={openPatientPharmacy}
          onClose={handleClosePatientPharmacy}
        >
           <MainCard title="Add New Patient Pharmacy" modal darkTitle content={false}> 
          <CardContent sx={{ width: 400 }}>
              <form onSubmit={handleAddNewPatientPharmacy}>
                <TextField
                  label="Patient Pharmacy"
                  value={newPatientPharmacy.name}
                  name="name"
                  variant="outlined"
                  sx={{ width: '100%' }}
                  onChange={(e) => setNewPatientPharmacy({ ...newPatientPharmacy, name: e.target.value })}
                />
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                  <Button variant="contained" type="submit">
                    Add
                  </Button>
                  <Button onClick={handleCloseModal} style={{ marginLeft: '10px' }}>
                    Cancel
                  </Button>
            </div>
              </form>
          </CardContent>
            </MainCard>
        </Modal>
        {/* Modal pour ajouter un nouveau liason secondary*/}
        <Modal
          aria-labelledby="unstyled-modal-title"
          aria-describedby="unstyled-modal-liaisonSecondary"
          open={openLiaisonSecondary}
          onClose={handleCloseLiaisonSecondary}
        >
           <MainCard title="Add New Liaison Secondary" modal darkTitle content={false}> 
          <CardContent sx={{ width: 400 }}>
              <form onSubmit={handleAddNewLiaisonSecondary}>
                <TextField
                  label="First Name"
                  value={newLiaisonSecondary.first_name || ''}
                  name="first_name"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewLiaisonSecondary({ ...newLiaisonSecondary, first_name: e.target.value })}
                  helperText="First name of the liaison"
                />
                <TextField
                  label="Last Name"
                  value={newLiaisonSecondary.last_name || ''}
                  name="last_name"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewLiaisonSecondary({ ...newLiaisonSecondary, last_name: e.target.value })}
                  helperText="Last name of the liaison"
                />
                <TextField
                  label="Phone"
                  value={newLiaisonSecondary.phone || ''}
                  name="phone"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewLiaisonSecondary({ ...newLiaisonSecondary, phone: e.target.value })}
                  helperText="Phone number"
                />
                <TextField
                  label="Email"
                  type="email"
                  value={newLiaisonSecondary.email || ''}
                  name="email"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewLiaisonSecondary({ ...newLiaisonSecondary, email: e.target.value })}
                  helperText="Email address"
                />
                <TextField
                  label="Relationship"
                  value={newLiaisonSecondary.relationship || ''}
                  name="relationship"
                  variant="outlined"
                  sx={{ width: '100%' }}
                  onChange={(e) => setNewLiaisonSecondary({ ...newLiaisonSecondary, relationship: e.target.value })}
                  helperText="Relationship to patient (e.g., Spouse, Child, Friend)"
                />
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                  <Button variant="contained" type="submit">
                    Add
                  </Button>
                  <Button onClick={handleCloseModal} style={{ marginLeft: '10px' }}>
                    Cancel
                  </Button>
                </div>
              </form>
          </CardContent>
            </MainCard>
        </Modal>

        {/* Modal pour ajouter un nouveau liaison primary  */}
        <Modal
          aria-labelledby="unstyled-modal-title"
          aria-describedby="unstyled-modal-liaison-primary"
          open={openLiaisonPrimary}
          onClose={handleCloseLiaisonPrimary}
        >
           <MainCard title="Add New Liaison Primary" modal darkTitle content={false}>  
          <CardContent sx={{ width: 400 }}>
              <form onSubmit={handleAddNewLiaisonPrimary}>
                <TextField
                  label="First Name"
                  value={newLiaisonPrimary.first_name || ''}
                  name="first_name"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewLiaisonPrimary({ ...newLiaisonPrimary, first_name: e.target.value })}
                  helperText="First name of the liaison"
                />
                <TextField
                  label="Last Name"
                  value={newLiaisonPrimary.last_name || ''}
                  name="last_name"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewLiaisonPrimary({ ...newLiaisonPrimary, last_name: e.target.value })}
                  helperText="Last name of the liaison"
                />
                <TextField
                  label="Phone"
                  value={newLiaisonPrimary.phone || ''}
                  name="phone"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewLiaisonPrimary({ ...newLiaisonPrimary, phone: e.target.value })}
                  helperText="Phone number"
                />
                <TextField
                  label="Email"
                  type="email"
                  value={newLiaisonPrimary.email || ''}
                  name="email"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewLiaisonPrimary({ ...newLiaisonPrimary, email: e.target.value })}
                  helperText="Email address"
                />
                <TextField
                  label="Relationship"
                  value={newLiaisonPrimary.relationship || ''}
                  name="relationship"
                  variant="outlined"
                  sx={{ width: '100%' }}
                  onChange={(e) => setNewLiaisonPrimary({ ...newLiaisonPrimary, relationship: e.target.value })}
                  helperText="Relationship to patient (e.g., Spouse, Child, Friend)"
                />
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                  <Button variant="contained" type="submit">
                    Add
                  </Button>
                  <Button onClick={handleCloseModal} style={{ marginLeft: '10px' }}>
                    Cancel
                  </Button>
                </div>
              </form>
          </CardContent>
           </MainCard>
        </Modal>
        {/* Modal pour ajouter un nouveau DNR  */}
        <Modal aria-labelledby="unstyled-modal-title" aria-describedby="unstyled-modal-DNR" open={openDnr} onClose={handleCloseDnr}>
          <MainCard  title="Add New DNR" modal darkTitle content={false}>
          <CardContent sx={{ width: 400 }}>
              <form onSubmit={handleAddNewDNR}>
                <TextField
                  label="DNR Status"
                  value={newDnr.dnr_status || ''}
                  name="dnr_status"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewDnr({ ...newDnr, dnr_status: e.target.value })}
                  helperText="Status of DNR (e.g., Active, Inactive)"
                />
                <TextField
                  label="DNR Date"
                  type="date"
                  value={newDnr.dnr_date || ''}
                  name="dnr_date"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewDnr({ ...newDnr, dnr_date: e.target.value })}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  helperText="Date when DNR was established"
                />
                <TextField
                  label="DNR Notes"
                  value={newDnr.dnr_notes || ''}
                  name="dnr_notes"
                  variant="outlined"
                  multiline
                  rows={3}
                  sx={{ width: '100%' }}
                  onChange={(e) => setNewDnr({ ...newDnr, dnr_notes: e.target.value })}
                  helperText="Additional notes about the DNR"
                />
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                  <Button variant="contained" type="submit">
                    Add
                  </Button>
                  <Button onClick={handleCloseModal} style={{ marginLeft: '10px' }}>
                    Cancel
                  </Button>
                </div>
              </form>
          </CardContent>
          </MainCard>
        </Modal>
        {/* Modal pour ajouter un nouveau  Race Ethnicity */}
        <Modal
          aria-labelledby="unstyled-modal-title"
          aria-describedby="unstyled-modal-RaceEthnicity"
          open={openRaceEthnicity}
          onClose={handleCloseRaceEthnicity}
        >
         <MainCard title="Add New Race Ethnicity" modal darkTitle content={false}> 
          <CardContent sx={{ width: 400 }}>
            <form onSubmit={handleAddNewRaceEthnicity}>
                <TextField
                  label="Race *"
                  value={newRaceEthnicity.race}
                  name="race"
                  variant="outlined"
                  sx={{ width: '100%', mb: 2 }}
                  onChange={(e) => setNewRaceEthnicity({ ...newRaceEthnicity, race: e.target.value })}
                  required
                />
                <TextField
                  label="Ethnicity"
                  value={newRaceEthnicity.ethnicity}
                  name="ethnicity"
                  variant="outlined"
                  sx={{ width: '100%' }}
                  onChange={(e) => setNewRaceEthnicity({ ...newRaceEthnicity, ethnicity: e.target.value })}
                />
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                  <Button variant="contained" type="submit">
                    Add
                  </Button>
                  <Button onClick={handleCloseModal} style={{ marginLeft: '10px' }}>
                    Cancel
                  </Button>
                </div>
              </form>
          </CardContent>
         
         <Divider />
          </MainCard>
        </Modal>
        {/* Modal pour ajouter un nouveau  EmergencyPreparednessLevel */}
       
        <Modal
          aria-labelledby="unstyled-modal-title"
          aria-describedby="unstyled-modal-EmergencyPreparednessLevel"
          open={openEmergencyPreparednessLevel}
          onClose={handleCloseEmergencyPreparednessLevel}
        >
          <MainCard title="Add Emergency Preparedness Level" modal darkTitle content={false}>
            <CardContent sx={{ width: 400 }}>
              <Grid item xs={12} sx={{ width: '100%' }}>
                <form onSubmit={handleAddNewEmergencyPreparednessLevel}>
                  <TextField
                    label="Level"
                    value={newEmergencyPreparednessLevel.level || ''}
                    name="level"
                    variant="outlined"
                    sx={{ width: '100%', mb: 2 }}
                    onChange={(e) => setNewEmergencyPreparednessLevel({ ...newEmergencyPreparednessLevel, level: e.target.value })}
                    helperText="Level of emergency preparedness (e.g., Level 1, Level 2)"
                  />
                  <TextField
                    label="Description"
                    value={newEmergencyPreparednessLevel.description || ''}
                    name="description"
                    variant="outlined"
                    multiline
                    rows={3}
                    sx={{ width: '100%' }}
                    onChange={(e) => setNewEmergencyPreparednessLevel({ ...newEmergencyPreparednessLevel, description: e.target.value })}
                    helperText="Description of the emergency preparedness level"
                  />
                  <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <Button variant="contained" type="submit">
                      Add
                    </Button>
                    <Button onClick={handleCloseModal} style={{ marginLeft: '10px' }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Grid>
            </CardContent>
            <Divider />
          </MainCard>
        </Modal>
      </MainCard>
    </>
  );
};
export default AddPatientPage;
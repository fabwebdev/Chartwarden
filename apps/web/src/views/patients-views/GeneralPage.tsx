import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Accordion, AccordionDetails, AccordionSummary, Autocomplete, Box, Checkbox, CircularProgress, FormControlLabel, FormGroup, Grid, Stack, InputLabel, TextField, MenuItem, Select, Button, SelectChangeEvent, Typography, Modal, CardContent } from '@mui/material';
import { ArrowDown2 } from 'iconsax-react';
import MainCard from 'components/MainCard';
import AuthService from 'types/AuthService';
import { updatePatient } from '../../api/patient';
import Swal from 'sweetalert2';
import http from '../../hooks/useCookie';
import { AddCircle } from 'iconsax-react';

interface GeneralPageProps {
  patientData?: any;
  onUpdate?: () => void;
}

const GeneralPage = ({ patientData: initialPatientData, onUpdate }: GeneralPageProps) => {
  const { user, logout, permissions } = AuthService();
  const { id } = useParams();
  const patientId = Array.isArray(id) ? id[0] : id;
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';
  
  // Check if user has permission to update patient
  const canUpdatePatient = () => {
    if (isAdmin) {
      return true;
    }
    return permissions.includes('update:patient') || 
           permissions.includes('patients_principal_menu_edit');
  };
  
  const hasUpdatePermission = canUpdatePatient();
  
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  
  // Dropdown data states
  const [dnrData, setDnrData] = useState<Array<{ id: string | number; dnr_status?: string | null; dnr_date?: string | null; dnr_notes?: string | null }>>([]);
  const [primaryDiagnosisList, setPrimaryDiagnosisList] = useState<Array<{ code: string; description: string; id?: number }>>([]);
  const [primaryDiagnosisListLoading, setPrimaryDiagnosisListLoading] = useState(false);
  const [selectedPrimaryDiagnosis, setSelectedPrimaryDiagnosis] = useState<{ code: string; description: string; id?: number } | null>(null);
  const [primaryDiagnosisSearchQuery, setPrimaryDiagnosisSearchQuery] = useState('');
  const [openPrimaryDiagnosis, setOpenPrimaryDiagnosis] = useState(false);
  const [newPrimaryDiagnosis, setNewPrimaryDiagnosis] = useState<{ code?: string; description?: string }>({ code: '', description: '' });
  const [patientPharmacyData, setPatientPharmacyData] = useState<Array<{ id: string | number; name?: string }>>([]);
  const [dmeProviderData, setDmeProviderData] = useState<Array<{ value: string; label: string }>>([]);
  const [liaisonPrimaryData, setLiaisonPrimaryData] = useState<Array<{ id: string | number; first_name?: string; last_name?: string; phone?: string; email?: string; relationship?: string }>>([]);
  const [liaisonSecondaryData, setLiaisonSecondaryData] = useState<Array<{ id: string | number; first_name?: string; last_name?: string; phone?: string; email?: string; relationship?: string }>>([]);
  const [emergencyPreparednessData, setEmergencyPreparednessData] = useState<Array<{ id: string | number; level?: string; description?: string }>>([]);
  const [raceEthnicityOptions, setRaceEthnicityOptions] = useState<{ races: string[]; detailedRaces: string[]; ethnicities: string[]; supportsMultiple: boolean } | null>(null);
  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);
  const [selectedEthnicities, setSelectedEthnicities] = useState<string[]>([]);
  const [raceEthnicityOptionsLoading, setRaceEthnicityOptionsLoading] = useState(false);
  const [detailedRacesExpanded, setDetailedRacesExpanded] = useState(false);

  useEffect(() => {
    if (initialPatientData) {
      setFormData(initialPatientData);
      
      // Load selected primary diagnosis if it exists
      // Check if it's a custom diagnosis (has numeric id) or ICD10 code (has code)
      if (initialPatientData.primary_diagnosis_id && typeof initialPatientData.primary_diagnosis_id === 'number') {
        // Custom diagnosis - has numeric ID
        setSelectedPrimaryDiagnosis({
          code: initialPatientData.primary_diagnosis_code || '',
          description: initialPatientData.primary_diagnosis_description || '',
          id: initialPatientData.primary_diagnosis_id
        });
      } else if (initialPatientData.primary_diagnosis_code && initialPatientData.primary_diagnosis_description) {
        // ICD10 code - has code but no numeric ID
        setSelectedPrimaryDiagnosis({
          code: initialPatientData.primary_diagnosis_code,
          description: initialPatientData.primary_diagnosis_description
        });
      } else if (initialPatientData.primary_diagnosis_id) {
        setSelectedPrimaryDiagnosis(null);
      }
      
      // Load race/ethnicity data - handle both arrays and comma-separated strings
      if (initialPatientData.races) {
        setSelectedRaces(Array.isArray(initialPatientData.races) ? initialPatientData.races : []);
      } else if (initialPatientData.race) {
        const raceArray = typeof initialPatientData.race === 'string' 
          ? initialPatientData.race.split(',').map((r: string) => r.trim()).filter(Boolean)
          : [];
        setSelectedRaces(raceArray);
      }
      
      if (initialPatientData.ethnicities) {
        setSelectedEthnicities(Array.isArray(initialPatientData.ethnicities) ? initialPatientData.ethnicities : []);
      } else if (initialPatientData.ethnicity) {
        const ethnicityArray = typeof initialPatientData.ethnicity === 'string'
          ? initialPatientData.ethnicity.split(',').map((e: string) => e.trim()).filter(Boolean)
          : [];
        setSelectedEthnicities(ethnicityArray);
      }
    }
  }, [initialPatientData]);

  useEffect(() => {
    if (hasUpdatePermission) {
      fetchDropdownData();
      fetchPrimaryDiagnosisList();
      fetchRaceEthnicityOptions();
    }
  }, [hasUpdatePermission]);

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

  // Handle Add New Primary Diagnosis
  const handleOpenPrimaryDiagnosis = () => setOpenPrimaryDiagnosis(true);
  const handleClosePrimaryDiagnosis = () => {
    setOpenPrimaryDiagnosis(false);
    setNewPrimaryDiagnosis({ code: '', description: '' });
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
          const errorMessage = errors.diagnosis_code?.[0] || errors.diagnosis_description?.[0] || 'Validation error';
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

  const fetchDropdownData = async () => {
    try {
      const [dnrRes, pharmacyRes, dmeRes, liaisonPrimaryRes, liaisonSecondaryRes, emergencyRes] = await Promise.all([
        http.get('/dnr/dnr'),
        http.get('/patient/patientPharmacy'),
        http.get('/dme-provider/providers'),
        http.get('/liaison-primary/liaisonPrimary'),
        http.get('/liaison-secondary/liaisonSecondary'),
        http.get('/emergency-preparedness-level/emergencyPreparednessLevel')
      ]);
      
      setDnrData(dnrRes.data || []);
      setPatientPharmacyData(pharmacyRes.data || []);
      setDmeProviderData(dmeRes.data || []);
      setLiaisonPrimaryData(liaisonPrimaryRes.data || []);
      setLiaisonSecondaryData(liaisonSecondaryRes.data || []);
      setEmergencyPreparednessData(emergencyRes.data || []);
    } catch (error: any) {
      console.error('Error fetching dropdown data:', error);
      if (error.response?.status === 401) {
        logout();
      }
    }
  };

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Special handling for SSN field
    if (name === 'ssn') {
      const formatted = formatSSN(value);
      setFormData((prev: any) => ({
        ...prev,
        [name]: formatted
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        [name || '']: value
      }));
    }
  };

  const handleSelectChange = (e: SelectChangeEvent<any>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name || '']: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    try {
      setLoading(true);
      
      // Exclude auto-managed fields (timestamps, IDs that shouldn't be updated)
      // These fields are managed by the database and should not be sent in update requests
      const excludedFields = [
        'id',
        'created_at',
        'updated_at',
        'createdAt',
        'updatedAt'
      ];
      
      // Filter out excluded fields and prepare payload with proper data types
      const updateableFields: any = {};
      Object.keys(formData).forEach(key => {
        if (!excludedFields.includes(key)) {
          updateableFields[key] = formData[key];
        }
      });
      
      // Prepare payload with proper data types and field name mappings
      const payload: any = {
        ...updateableFields,
        // Map field names to match schema exactly
        gender: formData.gender || formData.genders || updateableFields.gender || updateableFields.genders,
        // Schema supports both middle_name and mi, keep both if present
        middle_name: formData.middle_name || formData.mi || updateableFields.middle_name || updateableFields.mi,
        // Convert boolean fields from string "1"/"0" to boolean true/false
        hipaa_received: formData.hipaa_received === "1" || formData.hipaa_received === true || formData.hipaa_received === "true",
        patient_consents: formData.patient_consents === "1" || formData.patient_consents === true || formData.patient_consents === "true",
        oxygen_dependent: formData.oxygen_dependent === "1" || formData.oxygen_dependent === true || formData.oxygen_dependent === "true",
        // Veterans status - send as boolean true/false
        veterans_status: formData.veterans_status === "1" || formData.veterans_status === true || formData.veterans_status === "true" || formData.veterans_status === 1 || false
      };

      // Remove old/incorrect field names that have been mapped to correct schema fields
      delete payload.genders; // Schema uses 'gender'
      // Keep both mi and middle_name if both exist, or remove mi if middle_name exists
      if (payload.middle_name && payload.mi) {
        // Keep middle_name, remove mi if they're the same
        if (payload.mi === payload.middle_name) {
          delete payload.mi;
        }
      }
      
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

      // Remove any undefined or null timestamp-like fields that might have been missed
      Object.keys(payload).forEach(key => {
        // Remove any field that looks like a timestamp and is a string
        if (key.includes('_at') || key.includes('At')) {
          delete payload[key];
        }
        // Remove undefined/null values (but keep empty strings for optional text fields)
        if (payload[key] === undefined || payload[key] === null) {
          delete payload[key];
        }
      });

      await updatePatient(patientId, payload);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Patient information updated successfully!'
      });
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error('Error updating patient:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update patient information'
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format for date input
    } catch {
      return dateString;
    }
  };

  // Format date for display (read-only)
  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Helper function to get display text for dropdowns
  const getDnrDisplay = (dnr: any) => {
    const parts = [dnr.dnr_status, dnr.dnr_date ? new Date(dnr.dnr_date).toLocaleDateString() : '', dnr.dnr_notes].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : 'N/A';
  };

  const getLiaisonDisplay = (liaison: any) => {
    const parts = [liaison.first_name, liaison.last_name, liaison.phone, liaison.email, liaison.relationship].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : 'N/A';
  };

  const getEmergencyDisplay = (emergency: any) => {
    const parts = [emergency.level, emergency.description].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : 'N/A';
  };

  return (
    <MainCard title="General Information">
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>  
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="first_name">First Name</InputLabel>
              <TextField 
                fullWidth 
                name="first_name"
                value={formData?.first_name || ''} 
                id="first_name" 
                placeholder="First Name" 
                onChange={handleInputChange}
                disabled={!hasUpdatePermission} 
              />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="last_name">Last Name</InputLabel>
              <TextField 
                fullWidth 
                name="last_name"
                value={formData?.last_name || ''} 
                id="last_name" 
                placeholder="Last Name" 
                onChange={handleInputChange}
                disabled={!hasUpdatePermission} 
              />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={1}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="mi">MI</InputLabel>
              <TextField 
                fullWidth 
                name="mi"
                value={formData?.mi || ''} 
                id="mi" 
                placeholder="MI" 
                onChange={handleInputChange}
                disabled={!hasUpdatePermission} 
              />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="suffix">Suffix</InputLabel>
              <TextField 
                fullWidth 
                name="suffix"
                value={formData?.suffix || ''} 
                id="suffix" 
                placeholder="Suffix" 
                onChange={handleInputChange}
                disabled={!hasUpdatePermission} 
              />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="preferred_name">Preferred Name</InputLabel>
              <TextField 
                fullWidth 
                name="preferred_name"
                value={formData?.preferred_name || ''} 
                id="preferred_name" 
                placeholder="Preferred Name" 
                onChange={handleInputChange}
                disabled={!hasUpdatePermission} 
              />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="date_of_birth">Date Of Birth</InputLabel>
              <TextField 
                fullWidth 
                name="date_of_birth"
                type={hasUpdatePermission ? "date" : "text"}
                value={hasUpdatePermission ? formatDate(formData?.date_of_birth) : formatDateDisplay(formData?.date_of_birth)} 
                id="date_of_birth" 
                placeholder="Date of birth" 
                onChange={handleInputChange}
                disabled={!hasUpdatePermission}
                InputLabelProps={hasUpdatePermission ? { shrink: true } : undefined}
              />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="ssn">SSN</InputLabel>
              <TextField 
                fullWidth 
                name="ssn"
                value={formData?.ssn || ''} 
                id="ssn" 
                placeholder="xxx-xx-xxxx"
                onChange={handleInputChange}
                disabled={!hasUpdatePermission}
                inputProps={{
                  maxLength: 11, // xxx-xx-xxxx = 11 characters
                  pattern: '[0-9]{3}-[0-9]{2}-[0-9]{4}'
                }}
              />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="patient_consents">Patient Consents</InputLabel>
              <Select 
                fullWidth 
                name="patient_consents"
                id="patient_consents" 
                value={formData?.patient_consents ? (typeof formData.patient_consents === 'boolean' ? (formData.patient_consents ? "1" : "0") : formData.patient_consents) : "0"}
                onChange={handleSelectChange}
                disabled={!hasUpdatePermission}
              >
                <MenuItem value="1">Yes</MenuItem>
                <MenuItem value="0">No</MenuItem>
              </Select>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="hipaa_received">HIPAA received</InputLabel>
              <Select 
                fullWidth 
                name="hipaa_received"
                id="hipaa_received" 
                value={formData?.hipaa_received ? (typeof formData.hipaa_received === 'boolean' ? (formData.hipaa_received ? "1" : "0") : formData.hipaa_received) : "0"}
                onChange={handleSelectChange}
                disabled={!hasUpdatePermission}
              >
                <MenuItem value="1">Yes</MenuItem>
                <MenuItem value="0">No</MenuItem>
              </Select>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="dnr_id">DNR</InputLabel>
              <Select 
                fullWidth 
                name="dnr_id"
                id="dnr_id" 
                value={formData?.dnr_id || ''} 
                onChange={handleSelectChange}
                disabled={!hasUpdatePermission}
              >
                <MenuItem value="">None</MenuItem>
                {dnrData.map((dnr) => (
                  <MenuItem key={dnr.id} value={dnr.id}>
                    {getDnrDisplay(dnr)}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="primary_diagnosis_id">Primary Diagnosis</InputLabel>
              <Autocomplete
                fullWidth
                id="primary_diagnosis_id"
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
                      setFormData((prev: any) => ({
                        ...prev,
                        primary_diagnosis_id: newValue.id,
                        primary_diagnosis_code: undefined,
                        primary_diagnosis_description: newValue.description
                      }));
                    } else {
                      // ICD10 code - use primary_diagnosis_code
                      setFormData((prev: any) => ({
                        ...prev,
                        primary_diagnosis_id: undefined,
                        primary_diagnosis_code: newValue.code,
                        primary_diagnosis_description: newValue.description
                      }));
                    }
                  } else {
                    setSelectedPrimaryDiagnosis(null);
                    setFormData((prev: any) => ({
                      ...prev,
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
                    disabled={!hasUpdatePermission}
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
                disabled={!hasUpdatePermission}
              />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="patient_pharmacy_id">Patient Pharmacy</InputLabel>
              <Select 
                fullWidth 
                name="patient_pharmacy_id"
                id="patient_pharmacy_id" 
                value={formData?.patient_pharmacy_id || ''} 
                onChange={handleSelectChange}
                disabled={!hasUpdatePermission}
              >
                <MenuItem value="">None</MenuItem>
                {patientPharmacyData.map((pharmacy) => (
                  <MenuItem key={pharmacy.id} value={pharmacy.id}>
                    {pharmacy.name || `ID: ${pharmacy.id}`}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="gender">Gender</InputLabel>
              <Select 
                fullWidth 
                name="gender"
                id="gender" 
                value={formData?.gender || formData?.genders || ''} 
                onChange={handleSelectChange}
                disabled={!hasUpdatePermission}
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </Select>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="raceEthnicity">
                Race / Ethnicity
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
                    borderColor: 'divider',
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
                                disabled={!hasUpdatePermission}
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
                                  disabled={!hasUpdatePermission}
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
                                disabled={!hasUpdatePermission}
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
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="veterans_status">Veterans Status</InputLabel>
              <Select 
                fullWidth 
                name="veterans_status"
                id="veterans_status" 
                value={formData?.veterans_status !== undefined ? (typeof formData.veterans_status === 'boolean' ? (formData.veterans_status ? "1" : "0") : (formData.veterans_status === 1 || formData.veterans_status === "1" ? "1" : "0")) : "0"}
                onChange={handleSelectChange}
                disabled={!hasUpdatePermission}
              >
                <MenuItem value="1">Yes</MenuItem>
                <MenuItem value="0">No</MenuItem>
              </Select>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="dme_provider">DME Provider</InputLabel>
              <Select 
                fullWidth 
                name="dme_provider"
                id="dme_provider" 
                value={formData?.dme_provider || formData?.dme_provider_id || ''} 
                onChange={handleSelectChange}
                disabled={!hasUpdatePermission}
              >
                {dmeProviderData.map((option, index) => (
                  <MenuItem key={index} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="liaison_primary_id">Liaison (primary)</InputLabel>
              <Select 
                fullWidth 
                name="liaison_primary_id"
                id="liaison_primary_id" 
                value={formData?.liaison_primary_id || ''} 
                onChange={handleSelectChange}
                disabled={!hasUpdatePermission}
              >
                <MenuItem value="">None</MenuItem>
                {liaisonPrimaryData.map((liaison) => (
                  <MenuItem key={liaison.id} value={liaison.id}>
                    {getLiaisonDisplay(liaison)}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="liaison_secondary_id">Liaison (secondary)</InputLabel>
              <Select 
                fullWidth 
                name="liaison_secondary_id"
                id="liaison_secondary_id" 
                value={formData?.liaison_secondary_id || ''} 
                onChange={handleSelectChange}
                disabled={!hasUpdatePermission}
              >
                <MenuItem value="">None</MenuItem>
                {liaisonSecondaryData.map((liaison) => (
                  <MenuItem key={liaison.id} value={liaison.id}>
                    {getLiaisonDisplay(liaison)}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="emergency_preparedness_level_id">Emergency Preparedness Level</InputLabel>
              <Select 
                fullWidth 
                name="emergency_preparedness_level_id"
                id="emergency_preparedness_level_id" 
                value={formData?.emergency_preparedness_level_id || ''} 
                onChange={handleSelectChange}
                disabled={!hasUpdatePermission}
              >
                <MenuItem value="">None</MenuItem>
                {emergencyPreparednessData.map((emergency) => (
                  <MenuItem key={emergency.id} value={emergency.id}>
                    {getEmergencyDisplay(emergency)}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="date_of_referral">Date of Referral</InputLabel>
              <TextField 
                fullWidth 
                name="date_of_referral"
                type={hasUpdatePermission ? "date" : "text"}
                value={hasUpdatePermission ? formatDate(formData?.date_of_referral) : formatDateDisplay(formData?.date_of_referral)} 
                id="date_of_referral" 
                placeholder="Date of Referral" 
                onChange={handleInputChange}
                disabled={!hasUpdatePermission}
                InputLabelProps={hasUpdatePermission ? { shrink: true } : undefined}
              />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="who_took_referral">Who Took Referral</InputLabel>
              <TextField 
                fullWidth 
                name="who_took_referral"
                value={formData?.who_took_referral || ''} 
                id="who_took_referral" 
                placeholder="Who Took Referral" 
                onChange={handleInputChange}
                disabled={!hasUpdatePermission} 
              />
            </Stack>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Stack spacing={1.25}>
              <InputLabel htmlFor="referral_source">Referral Source</InputLabel>
              <Select 
                fullWidth 
                name="referral_source"
                id="referral_source" 
                value={formData?.referral_source || ''} 
                onChange={(e: SelectChangeEvent<any>) => {
                  const value = e.target.value;
                  setFormData((prev: any) => ({
                    ...prev,
                    referral_source: value,
                    // Clear referral_source_other if not "Other"
                    referral_source_other: value === 'Other' ? prev.referral_source_other : ''
                  }));
                }}
                disabled={!hasUpdatePermission}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="Hospital">Hospital</MenuItem>
                <MenuItem value="Doctor office">Doctor office</MenuItem>
                <MenuItem value="Family">Family</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </Stack>
          </Grid>
          {formData?.referral_source === 'Other' && (
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="referral_source_other">Referral Source Other</InputLabel>
                <TextField 
                  fullWidth 
                  name="referral_source_other"
                  value={formData?.referral_source_other || ''} 
                  id="referral_source_other" 
                  placeholder="Referral Source Other" 
                  onChange={handleInputChange}
                  disabled={!hasUpdatePermission} 
                />
              </Stack>
            </Grid>
          )}
          {hasUpdatePermission && (
            <Grid item xs={12}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Stack>
            </Grid>
          )}
        </Grid>
      </form>

      {/* Modal for adding a new Primary Diagnosis */}
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
                helperText="Diagnosis code (e.g., CUSTOM001)"
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
                <Button onClick={handleClosePrimaryDiagnosis} style={{ marginLeft: '10px' }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </MainCard>
      </Modal>
    </MainCard>
  );
};

export default GeneralPage;

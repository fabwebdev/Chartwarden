import {
  Grid,
  Stack,
  InputLabel,
  TextField,
  MenuItem,
  Typography,
  FormControl,
  Radio,
  FormControlLabel,
  RadioGroup,
  Select,
  Button
} from '@mui/material';
import SignatureCanvas from 'react-signature-canvas';
import MainCard from 'components/MainCard';
import { useEffect, useMemo, useState } from 'react';
import http from '../../../hooks/useCookie';
import StickyTable from 'sections/tables/react-table/StickyTable';
import AuthService from 'types/AuthService';

const DischargePage = ({ id }: { id: string }) => {
  const { permissions, user } = AuthService();
  const [sign, setSign] = useState<SignatureCanvas | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState<any>(null);
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
    race_ethnicity_name: '',
    liaison_primary_id: '',
    emergency_preparedness_level_id: '',
    oxygen_dependent: '',
    patient_consents: '',
    genders: '',
    dme_provider_id: '',
    patient_pharmacy_id: '',
    primary_diagnosis_id: ''
  });
  const [checkedSupportive, setCheckedSupportive] = useState<{ [key: string]: boolean }>({});
  const [dischargeData, setDischargeData] = useState<any>({
    type_of_record: '',
    national_provider_identifier: '',
    certification_number: '',
    social_security_number: '',
    medicare_number: '',
    medicaid_recipient: '',
    reason_for_discharge: '',
    reason_for_record: '',
    admission_date: '',
    discharge_date: '',
    patient_id: id
  });
  const [recordCompletionSignaturesData, setRecordCompletionSignaturesData] = useState<any>([
    {
      patient_id: id,
      date_section: '',
      section: '',
      signature: '',
      title: ''
    }
  ]);
  const saveAutoDischarge = (data: any) => {
    console.log('Discharge', data);

    http
      .post('/discharge/discharge/store', data)
      .then((response: any) => {
        console.log('living', response);
      })
      .catch((error: any) => {
        console.log('Arrangements', error);
      });
  };
  const supportiveAssistanceById = async () => {
    http
      .get(`/discharge/discharge/${id}`)
      .then((response: any) => {
        console.log('reason_for_discharge byId', response);
        setDischargeData(response.data);
        if (response.data.reason_for_discharge) {
          const idArray = response.data.reason_for_discharge.split(',');
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
    dischargeData.reason_for_discharge = selectedsupportiveIds;
    setDischargeData((prevData: any) => ({
      ...prevData,
      reason_for_discharge: selectedsupportiveIds
    }));
    saveAutoDischarge(dischargeData);
  };
  const fetchPatientData = async () => {
    http
      .get(`/patient/${id}`)
      .then((response: any) => {
        setPatientData(response.data);
      })
      .catch((error: any) => {});
  };
  // const [dischargeSectionsData, setDischargeSectionsData] = useState<any[]>([]);
  const [modifiedData, setModifiedData] = useState<any>({});

  const fetchDischargeSections = async () => {
    http
      .get('recordCompletionSignatures')
      .then((response: any) => {
        setRecordCompletionSignaturesData(response.data);
        console.log('dischargeSections', response);
      })
      .catch((error: any) => {
        console.log('dischargeSections', error);
      });
  };
  const fetchRecordCompletionSignatures = async () => {
    http
      .get(`/recordCompletionSignatures/${id}`)
      .then((response: any) => {
        // setRecordCompletionSignaturesData(response.data)
        console.log('recordCompl#', response);
      })
      .catch((error: any) => {
        console.log('recordCompl#', error);
      });
  };
  const saveAutoRecordCompletionSignatures = (data: any) => {
    console.log('RecordComplet', data);

    http
      .post('/recordCompletionSignatures/store', data)
      .then((response: any) => {
        console.log('Record*', response);
      })
      .catch((error: any) => {
        console.log('RecordCompletionSignatures*', error);
      });
  };
  const saveSignatures = () => {
    const data = {
      patient_id: id,
      signature_name: url
    };
    console.log('signature', data);

    http
      .post('/signature/signature/store', data)
      .then((response: any) => {
        console.log('Record*', response);
      })
      .catch((error: any) => {
        console.log('RecordCompletionSignatures*', error);
      });
  };
  const updateRowData = (newData: any) => {
    setRecordCompletionSignaturesData((prevData: any) => {
      let updatedData = { ...prevData };
      updatedData = { ...newData, patient_id: id };
      return updatedData;
    });
  };
  const imageSignatureById = async () => {
    http
      .get(`/signature/signature/${id}`)
      .then((response: any) => {
        setUrl(response.data.signature_name);
        setSignatureId(response.data.id);
      })
      .catch((error: any) => {});
  };
  const fetchDeleteSignatures = async () => {
    http
      .get(`/signature/${signatureId}`)
      .then((response: any) => {
        console.log('delete',response);
        
        setUrl(null);
      })
      .catch((error: any) => {});
  };
  useEffect(() => {
    fetchPatientData();
    supportiveAssistanceById();
    fetchDischargeSections();
    fetchRecordCompletionSignatures();
    imageSignatureById();
    const interval = setInterval(() => {
      if (sign && !sign.isEmpty()) {
        setUrl(sign.getTrimmedCanvas().toDataURL('image/png'));
      }else{
        setUrl(null);
      }
    }, 5000); // Mise à jour toutes les secondes

    return () => clearInterval(interval);
  }, [sign]);
  console.log(url);

  const columns = useMemo(
    () => [
      {
        Header: 'Signature',
        accessor: 'code',
        sticky: 'left',
        Cell: ({ row }: any) => (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ marginRight: '10px' }}>{row.original.code}</div>
            <TextField
              value={modifiedData[row.id]?.signature || row.original.signature}
              onChange={(e) => {
                const value = e.target.value;
                setModifiedData((prevData: any) => ({
                  ...prevData,
                  [row.id]: { ...prevData[row.id], signature: value, patient_id: id }
                }));
              }}
            />
          </div>
        )
      },
      {
        Header: 'Title',
        accessor: 'title',
        Cell: ({ row, index }: any) => (
          <TextField
            value={modifiedData[row.id]?.title || row.original.title}
            onChange={(e) => {
              const value = e.target.value;
              setModifiedData((prevData: any) => ({
                ...prevData,
                [row.id]: { ...prevData[row.id], title: value, patient_id: id }
              }));
            }}
          />
        )
      },
      {
        Header: 'Sections',
        accessor: 'section',
        Cell: ({ row, index }: any) => (
          <TextField
            value={row.original.section}
            onChange={(e) => {
              setModifiedData((prevData: any) => ({
                ...prevData,
                [row.id]: { ...prevData[row.id], title: row.original.section, patient_id: id }
              }));
            }}
          />
        )
      },
      {
        Header: 'Date Section Completed',
        accessor: 'date_section',
        Cell: ({ row, index }) => (
          <TextField
            type="date"
            value={modifiedData[row.id]?.date_section || row.original.date_section}
            onChange={(e) => {
              const value = e.target.value;
              setModifiedData((prevData: any) => ({
                ...prevData,
                [row.id]: { ...prevData[row.id], date_section: value, patient_id: id }
              }));
            }}
          />
        )
      }
    ],
    [modifiedData]
  );
  // Check if user has admin role
  const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';
  
  const hasPermission = (permission: any) => {
    // Admin users have all permissions
    if (isAdmin) {
      return true;
    }
    return permissions.includes(permission);
  };
  
  // Debug: Log admin status and permissions
  useEffect(() => {
    console.log('DischargePage - Admin Status:', isAdmin);
    console.log('DischargePage - User:', user);
    console.log('DischargePage - Permissions:', permissions);
    console.log('DischargePage - Has admin section permission:', hasPermission('administrative_information_section_discharge_hope_views'));
    console.log('DischargePage - Has record section permission:', hasPermission('record_administrative_section_discharge_hope_views'));
  }, [isAdmin, user, permissions]);
  
  return (
    <>
        {(isAdmin || hasPermission('administrative_information_section_discharge_hope_views')) && (
      <MainCard title="Section A Administrative Information ">
        <Grid container spacing={3} sx={{ p: 1 }}>
          <Grid item xs={12}>
            <Typography variant="h5">
              <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A0050</span> Type of Record
            </Typography>
            <Stack spacing={1.25}>
              <FormControl component="fieldset">
                <RadioGroup
                  aria-label="record"
                  name="record"
                  value={dischargeData.type_of_record}
                  onChange={(event: any) => {
                    const selected = event.target.value; // Convertir en booléen
                    setDischargeData((prevPatientData: any) => ({
                      ...prevPatientData,
                      type_of_record: selected
                    }));
                    saveAutoDischarge(dischargeData);
                  }}
                >
                  <Grid container>
                    <Grid item xs={12}>
                      <FormControlLabel value="1. Add new record" control={<Radio />} label="1. Add new record" />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel value="2. Modify existing record" control={<Radio />} label="2. Modify existing record" />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel value="3. Inactivate existing record" control={<Radio />} label="3. Inactivate existing record" />
                    </Grid>
                  </Grid>
                </RadioGroup>
              </FormControl>
            </Stack>
          </Grid>

          <Grid item xs={12} sx={{ p: 1 }}>
            <Typography variant="h5">
              {' '}
              <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A0100</span> Facility Provider Numbers. Enter
              code in boxes provided
            </Typography>
            <Grid item xs={12} sx={{ my: 2 }}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="">A. National Provider Identifier (NPI):</InputLabel>
                <TextField
                  id=""
                  type="number"
                  value={dischargeData.national_provider_identifier}
                  onChange={(event: any) => {
                    const selected = event.target.value;
                    setDischargeData((prevPatientData: any) => ({
                      ...prevPatientData,
                      national_provider_identifier: selected
                    }));
                    saveAutoDischarge(dischargeData);
                  }}
                  placeholder="National Provider Identifier"
                />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="">B. CMS Certification Number (CCN):</InputLabel>
                <TextField
                  id=""
                  type="number"
                  placeholder="Enter CMS Certification Number"
                  value={dischargeData.certification_number}
                  onChange={(event: any) => {
                    const selected = event.target.value;
                    setDischargeData((prevPatientData: any) => ({
                      ...prevPatientData,
                      certification_number: selected
                    }));
                    saveAutoDischarge(dischargeData);
                  }}
                />
              </Stack>
            </Grid>
          </Grid>

          <Grid item xs={12} sx={{ p: 1 }}>
            <Typography variant="h5">
              <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A0220</span> Admission Date{' '}
            </Typography>
            <Grid item xs={12}>
              <Stack spacing={1.25}>
                <TextField
                  id=""
                  type="date"
                  placeholder="Enter  Admission Date "
                  value={dischargeData.admission_date}
                  onChange={(event: any) => {
                    const selected = event.target.value;
                    setDischargeData((prevPatientData: any) => ({
                      ...prevPatientData,
                      admission_date: selected
                    }));
                    saveAutoDischarge(dischargeData);
                  }}
                />
              </Stack>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h5">
              <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A0250</span> Reason for Record{' '}
            </Typography>
            <Stack spacing={1.25}>
              <FormControl component="fieldset">
                <RadioGroup
                  aria-label="record"
                  name="record"
                  value={dischargeData.reason_for_record || ''}
                  onChange={(event: any) => {
                    const selected = event.target.value;
                    setDischargeData((prevPatientData: any) => ({
                      ...prevPatientData,
                      reason_for_record: selected
                    }));
                    saveAutoDischarge({ ...dischargeData, reason_for_record: selected });
                  }}
                >
                  <Grid container>
                    <Grid item xs={12}>
                      <FormControlLabel value="1" control={<Radio />} label="1. Admission (ADM)" />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel value="2" control={<Radio />} label="2. HOPE Update Visit 1 (HUV1)" />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel value="3" control={<Radio />} label="3. HOPE Update Visit 2 (HUV2)" />
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel value="9" control={<Radio />} label="9. Discharge (DC)" />
                    </Grid>
                  </Grid>
                </RadioGroup>
              </FormControl>
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Stack spacing={1.25}>
              <Typography variant="h5">
                <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A0270</span> Discharge Date{' '}
              </Typography>
              <TextField
                id=""
                type="date"
                placeholder="Enter Discharge Date "
                value={dischargeData.discharge_date}
                onChange={(event: any) => {
                  const selected = event.target.value;
                  setDischargeData((prevPatientData: any) => ({
                    ...prevPatientData,
                    discharge_date: selected
                  }));
                  saveAutoDischarge(dischargeData);
                }}
              />
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h5">
              <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A0500</span> Legal Name of Patient
            </Typography>
            <Grid item xs={12} sx={{ my: 2 }}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="">A. First Name:</InputLabel>
                <TextField
                  id=""
                  type="text"
                  value={patientData.first_name}
                  disabled
                  InputProps={{
                    readOnly: true, // Set `readOnly` for additional protection against selection
                    style: { backgroundColor: '#eee' } // Optional: Set a light gray background for visual indication
                  }}
                />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="">B. Middle initial:</InputLabel>
                <TextField
                  id=""
                  type="text"
                  value={patientData.mi}
                  disabled
                  InputProps={{
                    readOnly: true, // Set `readOnly` for additional protection against selection
                    style: { backgroundColor: '#eee' } // Optional: Set a light gray background for visual indication
                  }}
                />
              </Stack>
            </Grid>
            <Grid item xs={12} sx={{ my: 2 }}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="">C. Last Name:</InputLabel>
                <TextField
                  id=""
                  type="text"
                  value={patientData.last_name}
                  disabled
                  InputProps={{
                    readOnly: true, // Set `readOnly` for additional protection against selection
                    style: { backgroundColor: '#eee' } // Optional: Set a light gray background for visual indication
                  }}
                />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="">D. Suffix:</InputLabel>
                <TextField
                  id=""
                  placeholder=""
                  type="text"
                  value={patientData.suffix}
                  disabled
                  InputProps={{
                    readOnly: true, // Set `readOnly` for additional protection against selection
                    style: { backgroundColor: '#eee' } // Optional: Set a light gray background for visual indication
                  }}
                />
              </Stack>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h5">
              <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A0600</span> Social Security and Medicare
              Numbers
            </Typography>
            <Grid item xs={12} sx={{ my: 2 }}>
              <Stack spacing={1.25}>
                <InputLabel>A. Social Security Number:</InputLabel>
                <TextField
                  id=""
                  type="number"
                  value={dischargeData.social_security_number}
                  onChange={(event: any) => {
                    const selected = event.target.value;
                    setDischargeData((prevPatientData: any) => ({
                      ...prevPatientData,
                      social_security_number: selected
                    }));
                    saveAutoDischarge(dischargeData);
                  }}
                />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack spacing={1.25}>
                <InputLabel>B. Medicare number (or comparable railroad insurance number):</InputLabel>
                <TextField
                  id=""
                  type="number"
                  value={dischargeData.medicare_number}
                  onChange={(event: any) => {
                    const selected = event.target.value;
                    setDischargeData((prevPatientData: any) => ({
                      ...prevPatientData,
                      medicare_number: selected
                    }));
                    saveAutoDischarge(dischargeData);
                  }}
                />
              </Stack>
            </Grid>
          </Grid>

          <Grid item xs={12}>
            <Stack spacing={1.25}>
              <Typography variant="h5">
                <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A0700</span> Medicaid Number - Enter "+" if
                pending, "N" if not a Medicaid Recipient
              </Typography>
              <TextField
                id=""
                type="number"
                value={dischargeData.medicaid_recipient}
                onChange={(event: any) => {
                  const selected = event.target.value;
                  setDischargeData((prevPatientData: any) => ({
                    ...prevPatientData,
                    medicaid_recipient: selected
                  }));
                  saveAutoDischarge(dischargeData);
                }}
              />
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Stack spacing={1.25}>
              <Typography variant="h5">
                <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A0800</span> Gende
              </Typography>
              <FormControl fullWidth>
                <Select 
                  id="Gender" 
                  value={patientData.genders ? String(patientData.genders).toLowerCase() : ''}
                  disabled
                  displayEmpty
                >
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="male">Male</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Stack spacing={1.25}>
              <Typography variant="h5">
                <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A0900</span> Birth Date{' '}
              </Typography>
              <TextField id="" type="date" value={patientData.date_of_birth} />
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h5">
              <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A2115</span> Reason for Discharge{' '}
            </Typography>
            <Stack spacing={1.25}>
              <RadioGroup
                aria-label="record"
                name="record"
                value={dischargeData.reason_for_discharge}
                onChange={(event: any) => {
                  const selected = event.target.value; // Convertir en booléen
                  setDischargeData((prevPatientData: any) => ({
                    ...prevPatientData,
                    reason_for_discharge: selected
                  }));
                  saveAutoDischarge(dischargeData);
                }}
              >
                <Grid container>
                  <Grid item xs={12}>
                    <FormControlLabel value="01. Expired" control={<Radio />} label="01. Expired" />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel value="02. Revoked" control={<Radio />} label="02. Revoked" />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel value="03. No longer terminally ill" control={<Radio />} label="03. No longer terminally ill" />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      value="04. Moved out of hospice service area"
                      control={<Radio />}
                      label="04. Moved out of hospice service area"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      value="05. Transferred to another hospice"
                      control={<Radio />}
                      label="05. Transferred to another hospice"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel value="06. Discharged for cause" control={<Radio />} label="06. Discharged for cause" />
                  </Grid>
                </Grid>
              </RadioGroup>
            </Stack>
          </Grid>
        </Grid>
      </MainCard>
        )}
        {(isAdmin || hasPermission('record_administrative_section_discharge_hope_views')) && (
      <MainCard title="Section Z Record Administration ">
        <Grid container alignItems="center">
          <Grid item xs={12}>
            {' '}
            {/* Colonne pour le titre */}
            <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
              <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>Z0400</span> Signature(s) of Person(s)
              Completing the Record
            </Typography>
            <Typography variant="body1" sx={{ mt: 3 }}>
              I certify that the accompanying information accurately reflects patient assessment information for this patient and that I
              collected or coordinated collection of this information on the dates specified. To the best of my knowledge, this information
              was collected in accordance with applicable Medicare and Medicaid requirements. I understand that reporting this information
              is used as a basis for payment from federal funds. I further understand that failure to report such information may lead to a
              2 percentage point reduction in the Fiscal Year payment determination. I also certify that I am authorized to submit this
              information by this provider on its behalf.
            </Typography>
          </Grid>
          <Grid item xs={12} sx={{ my: 3 }}>
            {' '}
            {/* Colonne pour le contenu */}
            <StickyTable columns={columns} data={recordCompletionSignaturesData} />
          </Grid>
        </Grid>
        <Grid>
          <Typography variant="h5">
            <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>Z0500</span> Signature of Person Verifying Record
            Completion{' '}
          </Typography>
          <Grid container spacing={3} sx={{ p: 1 }}>
            <Grid item xs={12} md={6}>
              <Stack spacing={1.25}>
                <Typography variant="body1">A. Signature:</Typography>
                <Grid>
                  <div style={{ border: '1px solid #dbd8d8', minWidth: '300px', height: 150 }}>
                    {!url ? (
                      <SignatureCanvas
                        penColor="black"
                        canvasProps={{ width: 300, height: 200, className: 'sigCanvas' }}
                        ref={(data) => {
                          setSign(data), saveSignatures();
                        }}
                      />
                    ) : (
                      <img src={url} alt="Signature" style={{ width: 300, height: 100 }} />
                    )}
                  </div>
                  <Button variant="contained" type="submit" sx={{ my: 1 }} onClick={() => fetchDeleteSignatures()}>
                    Delete signature
                  </Button>
                </Grid>
              </Stack>
            </Grid>
            <Grid item xs={12} sx={{ p: 1 }} md={6}>
              <Typography variant="body1">B. Date: </Typography>
              <Grid item xs={12}>
                <Stack spacing={1.25}>
                  <TextField id="" type="date" placeholder="Enter  Admission Date " />
                </Stack>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </MainCard>
       )}
    </>
  );
};

export default DischargePage;

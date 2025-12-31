import {
  Grid,
  Stack,
  InputLabel,
  TextField,
  Typography,
  FormControl,
  Radio,
  FormControlLabel,
  RadioGroup,
  Button
} from '@mui/material';
import SignatureCanvas from 'react-signature-canvas';
import MainCard from 'components/MainCard';
import { useEffect, useMemo, useState } from 'react';
import http from '../../../hooks/useCookie';
import StickyTable from 'sections/tables/react-table/StickyTable';
import { usePatientStore } from '../../../store/patientStore';

const DischargePage = ({ id }: { id: string }) => {
  const { selectedPatientId, selectedPatientData, setSelectedPatient } = usePatientStore();
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
    gender: '',
    genders: '',
    dme_provider_id: '',
    patient_pharmacy_id: '',
    primary_diagnosis_id: ''
  });
  const [reasonForDischarge, setReasonForDischarge] = useState('');
  const [sign, setSign] = useState<SignatureCanvas | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [signatureId, setSignatureId] = useState<any>(null);
  const [recordCompletionSignaturesData, setRecordCompletionSignaturesData] = useState<any>([
    {
      patient_id: id,
      date_section: '',
      section: '',
      signature: '',
      title: ''
    }
  ]);
  const [modifiedData, setModifiedData] = useState<any>({});
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
        setReasonForDischarge(response.data.reason_for_discharge);
        // if (response.data.reason_for_discharge) {
        //   const idArray = response.data.reason_for_discharge.split(',');
        //   const checkedState: { [key: string]: boolean } = { ...checkedSupportive };
        //   idArray.forEach((id: any) => {
        //     checkedState[id] = true;
        //   });
        //   setCheckedSupportive(checkedState);
        // }
      })
      .catch((error: any) => {});
  };

  const fetchPatientData = async (patientId?: string | number) => {
    // Use patient ID from store if available, otherwise use props
    const patientIdToFetch = patientId || selectedPatientId || id;
    
    if (!patientIdToFetch) {
      console.warn('No patient ID available for fetching');
      return;
    }
    
    // If we have patient data in store and it matches the ID, use it first
    if (selectedPatientData && selectedPatientId && String(selectedPatientId) === String(patientIdToFetch)) {
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
        console.log('recordCompl#', response);
        // Handle the signature data if it exists
        if (response.data && response.data.signature_name) {
          // signature_name is binary data (bytea), convert it to displayable format
          const signatureData = response.data.signature_name;
          
          // If it's already a base64 string or data URL, use it directly
          if (typeof signatureData === 'string') {
            if (signatureData.startsWith('data:')) {
              setUrl(signatureData);
            } else {
              // Assume it's base64 and add the data URL prefix
              setUrl(`data:image/png;base64,${signatureData}`);
            }
          } else {
            // If it's binary data (ArrayBuffer, Blob, etc.), convert to data URL
            if (signatureData instanceof Blob) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setUrl(reader.result as string);
              };
              reader.readAsDataURL(signatureData);
            } else if (signatureData instanceof ArrayBuffer) {
              const blob = new Blob([signatureData], { type: 'image/png' });
              const reader = new FileReader();
              reader.onloadend = () => {
                setUrl(reader.result as string);
              };
              reader.readAsDataURL(blob);
            }
          }
          setSignatureId(response.data.id);
        }
      })
      .catch((error: any) => {
        console.log('recordCompl#', error);
      });
  };
  // Note: There is no POST endpoint for /api/recordCompletionSignatures
  // To store/update a signature, use POST /api/signature/signature/store
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
  // Fetch signature for Z0500 section (Signature of Person Verifying Record Completion)
  // Uses the same endpoint as fetchRecordCompletionSignatures since both return signature_name
  const imageSignatureById = async () => {
    http
      .get(`/recordCompletionSignatures/${id}`)
      .then((response: any) => {
        if (response.data && response.data.signature_name) {
          const signatureData = response.data.signature_name;
          
          // Handle binary data conversion
          if (typeof signatureData === 'string') {
            if (signatureData.startsWith('data:')) {
              setUrl(signatureData);
            } else {
              // Assume base64 and add data URL prefix
              setUrl(`data:image/png;base64,${signatureData}`);
            }
          } else {
            // Handle binary data (Blob, ArrayBuffer)
            if (signatureData instanceof Blob) {
              const reader = new FileReader();
              reader.onloadend = () => {
                setUrl(reader.result as string);
              };
              reader.readAsDataURL(signatureData);
            } else if (signatureData instanceof ArrayBuffer) {
              const blob = new Blob([signatureData], { type: 'image/png' });
              const reader = new FileReader();
              reader.onloadend = () => {
                setUrl(reader.result as string);
              };
              reader.readAsDataURL(blob);
            }
          }
          setSignatureId(response.data.id);
        }
      })
      .catch((error: any) => {
        console.log('Error fetching signature:', error);
      });
  };
  const fetchDeleteSignatures = async () => {
    // Note: Check with backend for the correct DELETE endpoint
    // For now, just clear the local state
    setUrl(null);
    setSignatureId(null);
    // If there's a DELETE endpoint, uncomment and use:
    // http
    //   .delete(`/signature/${signatureId}`)
    //   .then((response: any) => {
    //     console.log('delete', response);
    //     setUrl(null);
    //     setSignatureId(null);
    //   })
    //   .catch((error: any) => {
    //     console.log('Error deleting signature:', error);
    //   });
  };
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
    
    supportiveAssistanceById();
    fetchDischargeSections();
    fetchRecordCompletionSignatures();
    imageSignatureById();
    const interval = setInterval(() => {
      if (sign && !sign.isEmpty()) {
        setUrl(sign.getTrimmedCanvas().toDataURL('image/png'));
      } else {
        setUrl(null);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sign, selectedPatientId, selectedPatientData]);
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
        Cell: ({ row, index }: any) => (
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

  return (
    <>
      <MainCard title="Section A Administrative Information g">
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
                    const newDischargeData = { ...dischargeData, type_of_record: selected };
                    setDischargeData(newDischargeData);
                    saveAutoDischarge(newDischargeData); // Appel à saveAutoDischarge avec la nouvelle valeur de dischargeData
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
                    const newDischargeData = { ...dischargeData, national_provider_identifier: selected };
                    setDischargeData(newDischargeData);
                    saveAutoDischarge(newDischargeData);
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
                    const newDischargeData = { ...dischargeData, certification_number: selected };
                    setDischargeData(newDischargeData);
                    saveAutoDischarge(newDischargeData);
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
                    const newDischargeData = { ...dischargeData, admission_date: selected };
                    setDischargeData(newDischargeData);
                    saveAutoDischarge(newDischargeData);
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
                    const newDischargeData = { ...dischargeData, reason_for_record: selected };
                    setDischargeData(newDischargeData);
                    saveAutoDischarge(newDischargeData);
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
                  const newDischargeData = { ...dischargeData, discharge_date: selected };
                  setDischargeData(newDischargeData);
                  saveAutoDischarge(newDischargeData);
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
                <TextField id="" type="text" value={patientData.first_name} InputProps={{ readOnly: true }} />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="">B. Middle initial:</InputLabel>
                <TextField id="" type="text" value={patientData.mi} InputProps={{ readOnly: true }} />
              </Stack>
            </Grid>
            <Grid item xs={12} sx={{ my: 2 }}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="">C. Last Name:</InputLabel>
                <TextField id="" type="text" value={patientData.last_name} InputProps={{ readOnly: true }} />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Stack spacing={1.25}>
                <InputLabel htmlFor="">D. Suffix:</InputLabel>
                <TextField id="" placeholder="" type="text" value={patientData.suffix} InputProps={{ readOnly: true }} />
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
                    const newDischargeData = { ...dischargeData, social_security_number: selected };
                    setDischargeData(newDischargeData);
                    saveAutoDischarge(newDischargeData);
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
                    const newDischargeData = { ...dischargeData, medicare_number: selected };
                    setDischargeData(newDischargeData);
                    saveAutoDischarge(newDischargeData);
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
                  const newDischargeData = { ...dischargeData, medicaid_recipient: selected };
                  setDischargeData(newDischargeData);
                  saveAutoDischarge(newDischargeData);
                }}
              />
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Stack spacing={1.25}>
              <Typography variant="h5">
                <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A0800</span> Gender
              </Typography>
              <TextField 
                id="Gender" 
                type="text" 
                fullWidth
                value={(() => {
                  const genderValue = patientData?.gender || patientData?.genders || '';
                  if (!genderValue) return '';
                  const str = String(genderValue);
                  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
                })()}
                InputProps={{ readOnly: true }} 
              />
            </Stack>
          </Grid>

          <Grid item xs={12}>
            <Stack spacing={1.25}>
              <Typography variant="h5">
                <span style={{ background: '#36B1749F', borderRadius: '4px', color: '#fff' }}>A0900</span> Birth Date{' '}
              </Typography>
              <TextField id="" type="date" value={patientData.date_of_birth} InputProps={{ readOnly: true }} />
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
                  const newDischargeData = { ...dischargeData, reason_for_discharge: selected };
                  setDischargeData(newDischargeData);
                  saveAutoDischarge(newDischargeData);
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
    </>
  );
};

export default DischargePage;

import {
    Grid,
    Stack,
    FormControlLabel,
    Checkbox,
    TextField,
    Radio,
    Typography,
    FormControl,
    RadioGroup,
    Button
  } from '@mui/material';
  import MainCard from 'components/MainCard';
import AuthService from 'types/AuthService';
  
  const MedicationPage = () => {
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
        <MainCard title="Medications">
          <Grid container spacing={3}>
            {hasPermission('medictions_assessment_section_medictions_hope_views') && (
            <Grid item xs={12}>
            <div
              style={{
                borderLeft: '5px solid #0E83B9',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '500px',
                opacity:hasPermission('medictions_assessment_section_medictions_hope_edit')? 1 :0.9,
                  pointerEvents:hasPermission('medictions_assessment_section_medictions_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Mediction Assessment</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                <Typography variant="h5" color="dark">
                  SN Conferred with an Individual with Education and Raining in Drug Management:
                </Typography>
                <Stack spacing={1.25} sx={{mb:2}}>
                  <TextField id="outlined-multiline-flexible" variant="outlined" type="text" />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Medications Reviewed with Patient/Caregiver"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Caregiver Able to Adinister Medication as Prescribed:"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Patient Able to Take Medication as Prescribed:"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Medication Issues Identified:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Intravenous / Subcutaneous Access" />
                  </Stack>
                  <Button variant="contained">Review Medication Profile</Button>
                  <Typography variant="h5" color="dark" sx={{mb:2,mt:2}}>
                Medications
                </Typography>
                <Typography variant="h6" color="dark">
                Carbidopa-levodopa 25mg 100mg oral tablet, 25mg Oral QID - Four Times Daily, Parkinson, Start: 03/25/2024, Cavered by Hospice;
                Lorazepam 0.5 mg oral tablet, .5mg PO PRN - q4hr - Every 4 Hours As Needed, Start: 03/25/2024, Caregiver , Patient, Hospice, 
                morphine 20 mg/mL oral concentrate, 20mL PO PRN - q4hr - Every 4 Hours As Needed, pain, Start:  03/25/2024, Caregiver , Patient, Hospice, 
                Covered by Hospice Tylenol Extra Strength PM 500 mg-25 mg oral tablet, 500 mg oral PRN - BID - Twice Daily As Needed, pain, Start:  03/25/2024, Caregiver ,Covered by Hospice 
                </Typography>
                </Grid>
              </Grid>
            </div>
          </Grid>
            )}
            {hasPermission('scheduled_opioid_section_medictions_hope_views') && (
            <Grid item xs={12} md={6}>
            <div
              style={{
                borderLeft: '5px solid #0AA369',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity:hasPermission('scheduled_opioid_section_medictions_hope_edit')? 1 :0.9,
                  pointerEvents:hasPermission('scheduled_opioid_section_medictions_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Scheduled Opioid</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12} sx={{ mt: 1,ml:1 }}>
                  <Typography variant="h5" color="dark">
                    Was a scheduled opioid initiated or continued?
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
                </Grid>
              </Grid>
            </div>
          </Grid>
            )}
            {hasPermission('PRN_opioid_section_medictions_hope_views') && (
            <Grid item xs={12} md={6}>
            <div
              style={{
                borderLeft: '5px solid #0AA369',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity:hasPermission('PRN_opioid_section_medictions_hope_edit')? 1 :0.9,
                  pointerEvents:hasPermission('PRN_opioid_section_medictions_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>PRN Opioid</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12} sx={{ mt: 1,ml:1}}>
                  <Typography variant="h5" color="dark">
                    Was a PRN opioid initiated or continued?
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
                </Grid>
              </Grid>
            </div>
          </Grid>
            )}
            {hasPermission('bowel_regimen_section_medictions_hope_views') && (
            <Grid item xs={12}>
            <div
              style={{
                borderLeft: '5px solid #0AA369',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity:hasPermission('bowel_regimen_section_medictions_hope_edit')? 1 :0.9,
                  pointerEvents:hasPermission('bowel_regimen_section_medictions_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Bowel Regimen</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12} sx={{ mt: 1,ml:1}}>
                  <Typography variant="h5" color="dark">
                    Was a bowel Regimen initiated or continued?
                  </Typography>
                  <Typography variant="body2" color="dark">
                    Response required when answer to either NO500A or NO510A is "Yes"
                  </Typography>
                  <Stack spacing={1.25}>
                    <FormControl component="fieldset">
                      <RadioGroup aria-label="gender" name="gender1" value="2">
                        <Grid container>
                          <Grid item xs={12}>
                            <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="No" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="2" control={<Radio sx={{ p: 0, pr: 1 }} />} label="No, but ther is documentation of why a bowel regimen was not initiated or continued:" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="3" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Yes" />
                          </Grid>
                        </Grid>
                      </RadioGroup>
                    </FormControl>{' '}
                  </Stack>
                </Grid>
              </Grid>
            </div>
          </Grid>
            )}
            {hasPermission('allergies_section_medictions_hope_views') && (
            <Grid item xs={12}>
            <div
              style={{
                borderLeft: '5px solid #0A8CA3',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity:hasPermission('allergies_section_medictions_hope_edit')? 1 :0.9,
                  pointerEvents:hasPermission('allergies_section_medictions_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#4499BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Allergies</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12} sx={{ ml:1}}>
                <Button variant="contained">Add Allergy</Button>
                  <Typography variant="h5" color="dark">
                  Allergies
                  </Typography>
                  <Typography variant="body2" color="dark">
                    Cats 03/25/2025
                  </Typography>
                </Grid>
              </Grid>
            </div>
          </Grid>
            )}
          </Grid>
            {hasPermission('plan_of_care_orders_section_medictions_hope_views') && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{ 
                borderLeft: '5px solid #A624E2', 
                borderRadius: '5px', 
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity:hasPermission('plan_of_care_orders_section_medictions_hope_edit')? 1 :0.9,
                  pointerEvents:hasPermission('plan_of_care_orders_section_medictions_hope_edit') ? 'auto':'none' 
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
                        label="Need for Comfort Kit"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Stack>
                  </Grid>
                </Grid>
              </div>
            </Grid>
          </Grid>
          )}
        </MainCard>
      </>
    );
  };
  
  export default MedicationPage;
  
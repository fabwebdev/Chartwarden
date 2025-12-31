import {
    Grid,
    Stack,
    OutlinedInput,
    Typography,
    FormControl,
    Radio,
    FormControlLabel,
    RadioGroup,
    Checkbox,
  } from '@mui/material';
  import MainCard from 'components/MainCard';
import AuthService from 'types/AuthService';
const AdvanceCarePlanningPage = ({ id }: { id: string })=> {
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
        <MainCard title="Spiritual / Existential">
        {hasPermission('hospitalization_preference_section_advance_care_hope_views') && (
          <Grid>
            <div style={{ 
              borderLeft: '5px solid #0FC085', 
              borderRadius: '5px', 
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              opacity:hasPermission('visit_information_section_administrative_information_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('visit_information_section_administrative_information_hope_edit') ? 'auto':'none' }}>
              <div style={{ backgroundColor: '#1B9E4294', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Hospitalization Preference</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 2 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h5" color="dark">
                    Was the patient /responsible party asked about preference regarding hospitalization?
                  </Typography>
                  <Stack spacing={1.25}>
                    <FormControl component="fieldset">
                      <RadioGroup aria-label="gender" name="gender1" value="2">
                        <Grid container>
                          <Grid item xs={12}>
                            <FormControlLabel value="1" control={<Radio sx={{ p: 0, pr: 1 }} />} label="No" />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControlLabel value="2" control={<Radio sx={{ p: 0, pr: 1 }} />} label="Yes, and discussion occured:" />
                          </Grid>
                        </Grid>
                      </RadioGroup>
                    </FormControl>{' '}
                  </Stack>
                  <Grid item xs={12} sx={{ ml: 2, mb: 1 }}>
                    <Typography variant="h5" color="dark" sx={{ mt: 2 }}>
                    Hospitalization Preferences
                    </Typography>
                    <Stack spacing={1.25}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="The patient and/or caregiver expressed the desire to keep the patient at home and wishes to not transfer or be admitted to the hospital again for acute care."
                      />
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="The patient and/or caregiver discussed specific situations in which they feel acute hospitalization would be the preferred location for care."
                      />
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ p: 0 }} />}
                        label="The patient and/or caregiver stated that, at thope time, they are unsure if being transferred/admitted to a hospital for acute care is something they would consider."
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
                    Date the patient and/or caregiver was first asked about spiritual/existentiam concerns:
                  </Typography>
                  <Grid item>
                    <Stack spacing={1.25}>
                      <OutlinedInput id="" type="date" />
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
            </div>
          </Grid>
)}
{hasPermission('plan_of_care_orders_section_advance_care_hope_views') && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{ 
                borderLeft: '5px solid #A624E2', 
                borderRadius: '5px', 
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity:hasPermission('plan_of_care_orders_section_advance_care_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('plan_of_care_orders_section_advance_care_hope_edit') ? 'auto':'none' }}>
                <div style={{ backgroundColor: '#CC58F09F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Plan of Care Orders</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 1 }}>
                  <Grid item xs={12}>
                    <Stack spacing={1.25}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Need for Advance Care Planning:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Stack>
                    <Stack spacing={1.25}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Withdrawal of Life -Sustaining Treatments:"
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
  
  export default AdvanceCarePlanningPage;
  
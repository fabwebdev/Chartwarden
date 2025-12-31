import { Grid, Stack, FormControlLabel, Checkbox, TextField, InputAdornment, Button } from '@mui/material';
import MainCard from 'components/MainCard';
import { SearchNormal1 } from 'iconsax-react';
import AuthService from 'types/AuthService';

const FunctionalPage = () => {
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
      <MainCard title="Functional">
        <Grid container spacing={3}>
          {hasPermission('functional_assessment_section_functional_hope_views') && (
          <Grid item xs={12}>
            <div
              style={{
                borderLeft: '5px solid #0E83B9',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '630px',
                opacity:hasPermission('functional_assessment_section_functional_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('functional_assessment_section_functional_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Functional Assessment</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="No Problem Identified"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="ADL Dependent:"
                      sx={{ m: 0, p: 0 }}
                    />
                  </Stack>
                </Grid>
                {/* Première ligne */}
                <Grid container item xs={12} spacing={2} sx={{ml:3}}>
                  <Grid item xs={4}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Eating"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Toileting"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                  </Grid>
                  <Grid item xs={4}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Bathing"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Transferring"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                  </Grid>
                  <Grid item xs={4}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Daressing"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Continence"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="ADL Assistance:"
                      sx={{ m: 0, p: 0 }}
                    />
                  </Stack>
                </Grid>
                {/* Première ligne */}
                <Grid container item xs={12} spacing={2} sx={{ml:3}}>
                  <Grid item xs={4}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Eating"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Toileting"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                  </Grid>
                  <Grid item xs={4}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Bathing"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Transferring"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                  </Grid>
                  <Grid item xs={4}>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Daressing"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Continence"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Stack spacing={1.25}  sx={{mb:1}}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Altered Gait:"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Amputation:"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Atrophy:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Contracture" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Decreased Mobility" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="High Risk for Falls" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Joint Problems" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Limited ROM" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Muscle Weakness" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Weak Hand Grip Strength" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Other:" />
                  </Stack>
                  <Button variant="contained">Wound Worksheet</Button>
                </Grid>
              </Grid>
            </div>
          </Grid>  )}
          {hasPermission('fall_risk_assessment_tool_section_functional_hope_views') && (
          <Grid item xs={12}>
              <div
                style={{
                  borderLeft: '5px solid #0E83B9',
                  borderRadius: '5px',
                  boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                  opacity:hasPermission('fall_risk_assessment_tool_section_functional_hope_edit')? 1 :0.9,
                  pointerEvents:hasPermission('fall_risk_assessment_tool_section_functional_hope_edit') ? 'auto':'none' 
                }}
              >
                <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>MAHC 10 - Fall Risk Assessment Tool</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                    <Stack spacing={1.25} sx={{mb:1}}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Age 65+"
                        sx={{ m: 0, p: 0 }}
                      />
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Diagnossis (3 or more co-existing only documented medical diagnosis):"
                        sx={{ m: 0, p: 0 }}
                      />
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Prior history of falls within 3 months - An unintentional change in pasition in coming to rest on the groud or at lower level:" />
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Prior history - Inability to make it to the bathroom or commode in timely manner? Includes  fequency, urgency and/or nocturia." />
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Visual Impairment - Includes but not limited to, mascular degeration, diabetic retinopathies, visul fiel loss ange related changes, decline in visual acuity, accommodation, glare tolerance, depth perception, and night vission or not wearing prescribed glasses or having the correct pescription." />
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Implaired functional mobility - May include patients who need help with IADL's or ADL's or have gait or transfer problems arthrits, pain, fear of failling, foot problems, impaired sensation, impaired coordination or improper ue of assistive devices." />
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Poly Pharmacy (4 or more prescriptions - any type) All PRESCRITIONS Including prescritions for OTC meds. Drugs highly associated with fall risk include but are not limited to, sedatives, anti-depressants, tranquillizers, narcotics, antihypertensives, cardiacc meds, corticosteroids, anti-anxiety drugs, anticholinergic drugs, and hypoglycemic drugs." />
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Pain affecting level of function - Pain often affects an individual's desire or sbility to move or pain can be a factor in depression or compliance with safety recommendations.:" />
                      <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Cognitive impairment - Could include patients with dementia, Alzheimer's or stroke patients or patients who are confused, use poor judgment, have decreased comprehension, impulsivity, memory deficits Consider patient's ability to adhere to the plan of care." />
                    </Stack>
                    
                  </Grid>
                  <Grid item xs={12} md={9} sx={{ mt: 3 }}>
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
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Stack spacing={0.25}>
                      <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                    </Stack>
                  </Grid>
                </Grid>
              </div>
            </Grid>)}
        </Grid>
        {hasPermission('plan_of_care_orders_section_functional_hope_views') && (
        <Grid container spacing={3}>
            <Grid item xs={12}>
              <div style={{ 
                borderLeft: '5px solid #A624E2', 
                borderRadius: '5px', 
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity:hasPermission('plan_of_care_orders_section_functional_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('plan_of_care_orders_section_functional_hope_edit') ? 'auto':'none'  }}>
                <div style={{ backgroundColor: '#CC58F09F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Pan of Care Orders</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 1 }}>
                  <Grid item xs={12}>
                    <Stack spacing={1.25}>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Alteration in Functional Status:"
                        sx={{ m: 0, p: 0 }}
                      />
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Need for Fall prevention Plan:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Stack>
                  </Grid>
                </Grid>
              </div>
            </Grid>
          </Grid>)}
      </MainCard>
    </>
  );
};

export default FunctionalPage;

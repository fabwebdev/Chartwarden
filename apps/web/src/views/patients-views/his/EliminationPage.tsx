import {
  Grid,
  Stack,
  InputLabel,
  FormControlLabel,
  Checkbox,
  TextField,
  InputAdornment,
  Typography,
  Select,
  MenuItem,
} from '@mui/material';
import MainCard from 'components/MainCard';
import { SearchNormal1 } from 'iconsax-react';
import AuthService from 'types/AuthService';
const EliminationPage = () => {
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
      <MainCard title="Genitourinary">
        <Grid container spacing={3}>
      {hasPermission('genitourinary_assessment_section_elimination_hope_views') && (
          <Grid item xs={12} sm={12} md={6}>
            <div
              style={{
                borderLeft: '5px solid #189AAC',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '780px',
                opacity:hasPermission('genitourinary_assessment_section_elimination_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('genitourinary_assessment_section_elimination_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Genitourinary Assessment</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="No Problems identified"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Abnormal Unrine Appearance:"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Aboormal Contol:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Aboormal Volume:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Bladder distention:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Dialysis:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Indwelling/Foley Catheter" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Intermittent Catheterization" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Nocturia" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Suprapublic Catheter" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Condom Catheter" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Urostomy" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Nephrostomy" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Suprapublic Catheter" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Suprapublic Catheter" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Suprapublic Catheter" />
                  </Stack>
                </Grid>
                <Grid container item xs={12} spacing={2} sx={{ ml: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Acute Dysuria" />
                      <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Confusion" />
                      <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Flank Pain" />
                      <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="New/Marked Frequency" />
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={1.25}>
                      <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Catheter Pain/Te,derness" />
                      <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Fever:" />
                      <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Foul Odor:" />
                      <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Physician Notified: Actute S/S of UTI:" />
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
            </div>
          </Grid>)}
          {hasPermission('gastrointestinal_assessment_section_elimination_hope_views') && (
          <Grid item xs={12} sm={12} md={6}>
            <div
              style={{
                borderLeft: '5px solid #189AAC',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '780px',
                opacity:hasPermission('gastrointestinal_assessment_section_elimination_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('gastrointestinal_assessment_section_elimination_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#44BBB59F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Gastrointestinal Assessment</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                  <Typography variant="h5" color="dark">
                    Last BM:
                  </Typography>
                  <Stack spacing={1.25}>
                    <TextField id="outlined-multiline-flexible" variant="outlined" type="date" />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="No Problems identified"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Abnormal Bowel Sounds:"
                      sx={{ m: 0, p: 0 }}
                    />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Aboormal Stool:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Distended:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Hard" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Heartburn/Reflux" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Hemorrhoids" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Nausea" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Ostomy" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Rectal Bleeding" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Tenderness" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Vomiting" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Venting Gastrostomy Tube:" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Ng Tube for Decompression" />
                    <FormControlLabel value="right" control={<Checkbox sx={{ p: 0 }} />} label="Other" />
                  </Stack>
                </Grid>
              </Grid>
            </div>
          </Grid>
)}
        </Grid>
{hasPermission('narrative_template_section_elimination_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div
              style={{
                borderLeft: '5px solid #0E83B9',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                opacity:hasPermission('narrative_template_section_elimination_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('narrative_template_section_elimination_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Narrative Template</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                  <Grid item xs={12} md={9}>
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
                  <Grid item xs={12} sx={{ mt: 3 }}>
                    <Stack spacing={0.25}>
                      <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                    </Stack>
                  </Grid>
                </Grid>
              </Grid>
            </div>
          </Grid>
        </Grid>
)}
        {hasPermission('plan_of_care_orders_section_elimination_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div style={{ 
              borderLeft: '5px solid #A624E2', 
              borderRadius: '5px',
               boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
               opacity:hasPermission('plan_of_care_orders_section_elimination_hope_edit')? 1 :0.9,
               pointerEvents:hasPermission('plan_of_care_orders_section_elimination_hope_edit') ? 'auto':'none'  }}>
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
                  <Grid item xs={12} sx={{ ml: 4, mb: 1 }}>
                    <Typography variant="h5" color="dark">
                      Select Problem Statement
                    </Typography>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Nausea/Vomiting:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Constipation:"
                        sx={{ m: 0, p: 0 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Stack spacing={0.25} sx={{ ml: 4 }}>
                        <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sx={{ ml: 4, mb: 1 }}>
                      <Typography variant="h5" color="dark">
                        Goals
                      </Typography>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Regular Bowel Movement:"
                        sx={{ m: 0, p: 0 }}
                      />
                      <Grid item xs={12}>
                        <Stack spacing={0.25} sx={{ ml: 4 }}>
                          <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" />
                          <Grid item xs={12} sm={6} md={2}>
                            <Stack spacing={1.25}>
                              <InputLabel htmlFor="">Goal Length</InputLabel>
                              <Select fullWidth id="scale" value="1" placeholder="Select Marital Status">
                                <MenuItem value="1">6 Days</MenuItem>
                              </Select>
                            </Stack>
                          </Grid>
                        </Stack>
                      </Grid>
                      <Grid>
                        <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="CC/GIP goal:"
                          sx={{ m: 0, p: 0 }}
                        />
                      </Grid>
                      <Grid>
                        <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Prevent/Treat Constipation:"
                          sx={{ m: 0, p: 0 }}
                        />
                      </Grid>
                      <Grid>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Other:" sx={{ m: 0, p: 0 }} />
                      </Grid>
                    </Grid>
                    <Grid item xs={12} sx={{ ml: 4, mb: 1 }}>
                      <Typography variant="h5" color="dark">
                        Interventions
                      </Typography>
                      <FormControlLabel
                        value="right"
                        control={<Checkbox sx={{ m: 0, p: 0 }} />}
                        label="Perform: Bowel History:"
                        sx={{ m: 0, p: 0 }}
                      />
                      <Grid item xs={12}>
                        <Stack spacing={0.25} sx={{ ml: 4 }}>
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
                          label="Perform; Disimpaction:"
                          sx={{ m: 0, p: 0 }}
                        />
                      </Grid>
                      <Grid>
                        <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Teach: Mobility:"
                          sx={{ m: 0, p: 0 }}
                        />
                      </Grid>
                      <Grid>
                        <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Teach: Positioning:"
                          sx={{ m: 0, p: 0 }}
                        />
                      </Grid>
                      <Grid>
                        <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Perform: Administer Medictions:"
                          sx={{ m: 0, p: 0 }}
                        />
                      </Grid>
                      <Grid>
                        <FormControlLabel
                          value="right"
                          control={<Checkbox sx={{ m: 0, p: 0 }} />}
                          label="Teach: Bowel Regimen:"
                          sx={{ m: 0, p: 0 }}
                        />
                      </Grid>
                      <Grid>
                        <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Other:" sx={{ m: 0, p: 0 }} />
                      </Grid>
                    </Grid>
                  </Grid>
                  <Stack spacing={1.25}>
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Diarrhea:" sx={{ m: 0, p: 0 }} />
                  </Stack>{' '}
                  <Stack spacing={1.25}>
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Incontinence:" sx={{ m: 0, p: 0 }} />
                  </Stack>{' '}
                  <Stack spacing={1.25}>
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Ostomy:" sx={{ m: 0, p: 0 }} />
                  </Stack>{' '}
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Urinary Catheter:"
                      sx={{ m: 0, p: 0 }}
                    />
                  </Stack>{' '}
                  <Stack spacing={1.25}>
                    <FormControlLabel value="right" control={<Checkbox sx={{ m: 0, p: 0 }} />} label="Other:" sx={{ m: 0, p: 0 }} />
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

export default EliminationPage;

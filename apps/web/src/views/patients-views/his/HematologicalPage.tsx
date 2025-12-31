import {
    Grid,
    Stack,
    FormControlLabel,
    Checkbox,
    TextField,
    InputAdornment,
  } from '@mui/material';
  import MainCard from 'components/MainCard';
  import { SearchNormal1 } from 'iconsax-react';
  import http from '../../../hooks/useCookie';
  import { useEffect, useState } from 'react';
import AuthService from 'types/AuthService';
  const HematologicalPage =  ({ id }: { id: string }) => {
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
    const [checkedHematological, setCheckedHematological] = useState<{ [key: string]: boolean }>({});
    const [hematologicalAssessmentData, setHematologicalAssessmentData] = useState<{ id: string; name: string; }[]>([]);    
    const hematological = async () => {
      http
        .get(`/hematological-assessment/hematological-list`)
        .then((response: any) => {
          setHematologicalAssessmentData(response.data);
        })
        .catch((error: any) => {});
    };
    const hematologicalById = async () => {
      http
        .get(`/hematological-assessment/hematological-assessment/${id}`)
        .then((response: any) => {
          if (response.data.hematological_ids) {
            const idArray = response.data.hematological_ids.split(',');
            const checkedState: { [key: string]: boolean } = { ...checkedHematological };
            idArray.forEach((id:any) => {
              checkedState[id] = true;
            });
            setCheckedHematological(checkedState);
          }
        })
        .catch((error: any) => {});
    };

    const handleCheckboxChange = (ids:any) => {
      console.log('handleCheckboxChange called with id:', ids);
      // Inverser l'état de la case cochée/décochée
      const updatedCheckedHematological: { [key: string]: boolean } = {
        ...checkedHematological,
        [ids]: !checkedHematological[ids]
      };
      // Mettre à jour l'état local des cases cochées
      setCheckedHematological(updatedCheckedHematological);
      // Récupérer les ID des problèmes cochés
      const selectedHematologicalIds = Object.keys(updatedCheckedHematological).filter(key => updatedCheckedHematological[key]);
      console.log('Hematological POST API called with data:', {
        patient_id: id,
        hematological_ids: selectedHematologicalIds
      });
      http
      .post(`/hematological-assessment/hematological-assessment/store`, {
        patient_id: id,
        hematological_ids: selectedHematologicalIds
      })
      .then((response: any) => {
        console.log('Hematological POST API success:', response);
      })
      .catch((error: any) => {
        console.error('Hematological POST API error:', error);
        console.error('Error details:', error.response?.data || error.message);
      });
    };
    useEffect(() => {
      hematological();
      hematologicalById();
    }, []);
    return (
      <>
        <MainCard title="Hematological">
         {hasPermission('hematological_assessment_section_hematological_hope_views') && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div
                style={{
                  borderLeft: '5px solid #0E83B9',
                  borderRadius: '5px',
                  boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                  opacity:hasPermission('hematological_assessment_section_hematological_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('hematological_assessment_section_hematological_hope_edit') ? 'auto':'none' 
                }}
              >
                <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Hematological Assessment</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                    <Stack spacing={1.25}>
                    {hematologicalAssessmentData.map((hematological) => (
                      <FormControlLabel
                        key={hematological.id}
                        control={
                          <Checkbox
                            sx={{ m: 0, p: 0 }}
                            value={hematological.id}
                            checked={Boolean(checkedHematological[hematological.id])}
                            onChange={() => handleCheckboxChange(hematological.id.toString())}
                          />
                        }
                        label={hematological.name}
                      />
                    ))}
                    </Stack>
                  </Grid>
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
              </div>
            </Grid>   
          </Grid>)}
        </MainCard>
      </>
    );
  };
  
  export default HematologicalPage;
  
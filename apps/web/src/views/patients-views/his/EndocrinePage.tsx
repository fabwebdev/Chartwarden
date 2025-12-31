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
  const EndocrinePage =  ({ id }: { id: string })=> {
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
    const [checkedEndocrine, setCheckedEndocrine] = useState<{ [key: string]: boolean }>({});
    const [endocrineAssessmentData, setEndocrineAssessmentData] = useState<{ id: string; name: string; }[]>([]);    
    const endocrine = async () => {
      http
        .get(`/endocrine-assessment/endocrine-list`)
        .then((response: any) => {
          setEndocrineAssessmentData(response.data);
        })
        .catch((error: any) => {});
    };  
    const endocrineById = async () => {
      http
        .get(`/endocrine-assessment/endocrine-assessment/${id}`)
        .then((response: any) => {
          if (response.data.endocrine_ids) {
            const idArray = response.data.endocrine_ids.split(',');
            const checkedState: { [key: string]: boolean } = { ...checkedEndocrine };
            idArray.forEach((id:any) => {
              checkedState[id] = true;
            });
            setCheckedEndocrine(checkedState);
          }
        })
        .catch((error: any) => {});
    };

    const handleCheckboxChange = (ids:any) => {
      // Inverser l'état de la case cochée/décochée
      const updatedCheckedEndocrine: { [key: string]: boolean } = {
        ...checkedEndocrine,
        [ids]: !checkedEndocrine[ids]
      };
      // Mettre à jour l'état local des cases cochées
      setCheckedEndocrine(updatedCheckedEndocrine);
      // Récupérer les ID des problèmes cochés
      const selectedEndocrineIds = Object.keys(updatedCheckedEndocrine).filter(key => updatedCheckedEndocrine[key]);
      http
      .post(`/endocrine-assessment/endocrine-assessment/store`, {
        patient_id: id,
        endocrine_ids: selectedEndocrineIds
      })
      .then((response: any) => {
        console.log('Endocrine assessment saved:', response);
      })
      .catch((error: any) => {
      });
    };
    useEffect(() => {
      endocrine();
      endocrineById();
    }, []);
    return (
      <>
        <MainCard title="Endocrine">
            {hasPermission('endocrine_assessment_section_endocrine_hope_views') && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div
                style={{
                  borderLeft: '5px solid #0E83B9',
                  borderRadius: '5px',
                  boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                  opacity:hasPermission('endocrine_assessment_section_endocrine_hope_edit')? 1 :0.9,
                  pointerEvents:hasPermission('endocrine_assessment_section_endocrine_hope_edit') ? 'auto':'none' 
                }}
              >
                <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Endocrine Assessment</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                    <Stack spacing={1.25}>
                    {endocrineAssessmentData.map((endocrine) => (
                      <FormControlLabel
                        key={endocrine.id}
                        control={
                          <Checkbox
                            sx={{ m: 0, p: 0 }}
                            value={endocrine.id}
                            checked={Boolean(checkedEndocrine[endocrine.id])}
                            onChange={() => handleCheckboxChange(endocrine.id.toString())}
                          />
                        }
                        label={endocrine.name}
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
          </Grid>
        )}
        </MainCard>
      </>
    );
  };
  
  export default EndocrinePage;
  
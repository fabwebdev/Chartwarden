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

const CardiacPage = ({ id }: { id: string }) => {
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
  const [checkedCardiac, setCheckedCardiac] = useState<{ [key: string]: boolean }>({});
  const [cardiacAssessmentData, setCardiacAssessmentData] = useState<{ id: string; name: string }[]>([]);
  const Cardiac = async () => {
    http
      .get(`/cardiac-assessment/cardiac-list`)
      .then((response: any) => {
        console.log('CardiacAssessmentData', response);
        setCardiacAssessmentData(response.data);
      })
      .catch((error: any) => {});
  };
  const CardiacById = async () => {
    http
      .get(`/cardiac-assessment/cardiac-assessment/${id}`)
      .then((response: any) => {
        console.log('byid', response);

        if (response.data.cardiac_ids) {
          const idArray = response.data.cardiac_ids.split(',');
          const checkedState: { [key: string]: boolean } = { ...checkedCardiac };
          idArray.forEach((id: any) => {
            checkedState[id] = true;
          });
          setCheckedCardiac(checkedState);
        }
      })
      .catch((error: any) => {});
  };

  const handleCheckboxChange = (ids: any) => {
    // Inverser l'état de la case cochée/décochée
    const updatedCheckedCardiac: { [key: string]: boolean } = {
      ...checkedCardiac,
      [ids]: !checkedCardiac[ids]
    };
    // Mettre à jour l'état local des cases cochées
    setCheckedCardiac(updatedCheckedCardiac);
    // Récupérer les ID des problèmes cochés
    const selectedCardiacIds = Object.keys(updatedCheckedCardiac).filter((key) => updatedCheckedCardiac[key]);
    http
      .post(`/cardiac-assessment/cardiac-assessment/store`, {
        patient_id: id,
        cardiac_ids: selectedCardiacIds
      })
      .then((response: any) => {
        console.log('response', response);
      })
      .catch((error: any) => {
        console.log('error', error);
      });
  };
  useEffect(() => {
    Cardiac();
    CardiacById();
  }, []);
  return (
    <>
      <MainCard title="Cardiac">
      {hasPermission('cardiac_assessment_section_cardiac_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div
              style={{
                borderLeft: '5px solid #0E83B9',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '630px',
                opacity:hasPermission('cardiac_assessment_section_cardiac_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('cardiac_assessment_section_cardiac_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Cardiac Assessment</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    {cardiacAssessmentData.map((cardiac) => (
                      <FormControlLabel
                        key={cardiac.id}
                        control={
                          <Checkbox
                            sx={{ m: 0, p: 0 }}
                            value={cardiac.id}
                            checked={Boolean(checkedCardiac[cardiac.id])}
                            onChange={() => handleCheckboxChange(cardiac.id.toString())}
                          />
                        }
                        label={cardiac.name}
                      />
                    ))}
                  </Stack>
                </Grid>
                <Grid item xs={12}>
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
       {hasPermission('plan_of_care_orders_section_cardiac_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div style={{ 
              borderLeft: '5px solid #A624E2', 
              borderRadius: '5px', 
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              opacity:hasPermission('plan_of_care_orders_section_cardiac_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('plan_of_care_orders_section_cardiac_hope_edit') ? 'auto':'none'  }}>
              <div style={{ backgroundColor: '#CC58F09F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Plan of Care Orders</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      value="right"
                      control={<Checkbox sx={{ m: 0, p: 0 }} />}
                      label="Altration in Cardiac Status:"
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

export default CardiacPage;

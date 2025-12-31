import {
  Grid,
  Stack,
  FormControlLabel,
  Checkbox,
  TextField,
  InputAdornment,
  Typography,
} from '@mui/material';
import MainCard from 'components/MainCard';
import { SearchNormal1 } from 'iconsax-react';
import { useEffect, useState } from 'react';
import http from '../../../hooks/useCookie';
import AuthService from 'types/AuthService';

const NutritionPage = ({ id }: { id: string })=> {
  const [checkedProblems, setCheckedProblems] =useState<{ [key: string]: boolean }>({});
  const [checkedTemplate, setCheckedTemplate] =useState<{ [key: string]: boolean }>({});
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
  const [nutritionTemplateData, setNutritionTemplateData] = useState<{ id: string; name: string }[]>([]);
  const [nutritionProblemsData, setNutritionProblemsData] = useState<{ id: string; name: string }[]>([]);
  const nutitionProblems = async () => {
    http
      .get(`/select/nutrition-problem`)
      .then((response: any) => {
        console.log('nutitionProblems', response);
        setNutritionProblemsData(response.data);
      })
      .catch((error: any) => {});
  };
  const nutitionTemplate = async () => {
    http
      .get(`/select/nutrition-template`)
      .then((response: any) => {
        console.log('nutitionTemplate', response);
        setNutritionTemplateData(response.data);
      })
      .catch((error: any) => {});
  };

  const nutitionProblemsById = async () => {
    http
      .get(`/nutrition-assessment/nutrition/${id}`)
      .then((response: any) => {
        console.log('Nutrition assessment by ID response:', response);

        // Handle response structure: { nutrition_assessment: {...} }
        if (response.data?.nutrition_assessment) {
          const assessment = response.data.nutrition_assessment;
          
          // Pre-select nutrition problems checkboxes
          if (assessment.nutrition_problems_type_ids) {
            const idArray = assessment.nutrition_problems_type_ids.split(',').filter((id: string) => id.trim() !== '');
            const checkedState: { [key: string]: boolean } = {};
            idArray.forEach((id: any) => {
              checkedState[id.trim()] = true;
            });
            setCheckedProblems(checkedState);
          }
          
          // Pre-select nutrition template checkboxes
          if (assessment.nutrition_template_ids) {
            const idArray = assessment.nutrition_template_ids.split(',').filter((id: string) => id.trim() !== '');
            const checkedState: { [key: string]: boolean } = {};
            idArray.forEach((id: any) => {
              checkedState[id.trim()] = true;
            });
            setCheckedTemplate(checkedState);
          }
        }
      })
      .catch((error: any) => {
        // Handle 404 - no assessment exists yet (this is expected for new patients)
        if (error.response?.status === 404) {
          console.log('No existing nutrition assessment found - starting with empty selection');
          setCheckedProblems({});
          setCheckedTemplate({});
        } else {
          console.error('Error fetching nutrition assessment by ID:', error);
          console.error('Error details:', error.response?.data || error.message);
        }
      });
  };

  const handleCheckboxChange = (ids: any) => {
    // Inverser l'état de la case cochée/décochée
    const updatedcheCkedProblems: { [key: string]: boolean } = {
      ...checkedProblems,
      [ids]: !checkedProblems[ids]
    };
    const updatedcheCkedTemplate: { [key: string]: boolean } = {
      ...checkedTemplate,
      [ids]: !checkedTemplate[ids]
    };
    // Mettre à jour l'état local des cases cochées
    setCheckedProblems(updatedcheCkedProblems);
    setCheckedTemplate(updatedcheCkedTemplate);
    // Récupérer les ID des problèmes cochés
    const selectedNutritionIds = Object.keys(updatedcheCkedProblems).filter((key) => updatedcheCkedProblems[key]);
    const selectedTemplateIds = Object.keys(updatedcheCkedTemplate).filter((key) => updatedcheCkedTemplate[key]);
    http
      .post(`/nutrition-assessment/nutrition/${id}/auto-save`, {
        patient_id: id,
        nutrition_problems_type_ids: selectedNutritionIds,
        nutrition_template_ids: selectedTemplateIds,
      })
      .then((response: any) => {
        console.log('Nutrition assessment saved:', response);
      })
      .catch((error: any) => {
        console.error('Error saving nutrition assessment:', error);
        console.error('Error details:', error.response?.data || error.message);
      });
  };
  
  useEffect(() => {
    nutitionTemplate();
    nutitionProblems();
    nutitionProblemsById();
  }, []);

  return (
    <>
      <MainCard title="Nutrition">
       {hasPermission('nutritionk_assessment_section_nutrition_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div
              style={{
                borderLeft: '5px solid #0E83B9',
                borderRadius: '5px',
                boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                minHeight: '630px',
                opacity:hasPermission('nutritionk_assessment_section_nutrition_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('nutritionk_assessment_section_nutrition_hope_edit') ? 'auto':'none' 
              }}
            >
              <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Nutrition Assessment</h2>
              </div>
              <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12}>
                  <Stack spacing={1.25}>
                    {nutritionProblemsData.map(problem => (
                      <FormControlLabel
                        key={problem.id}
                        value={problem.id}
                        control={
                          <Checkbox
                            sx={{ m: 0, p: 0 }}
                            checked={Boolean(checkedProblems[problem.id.toString()])}
                            onChange={() => handleCheckboxChange(problem.id.toString())}
                          />
                        }
                        label={`${problem.id} ${problem.name}`}
                        sx={{ m: 0, p: 0 }}
                      />
                    ))}
                  </Stack>
              </Grid>
                <Grid item xs={12} md={9} sx={{ mt: 3 }}>
                  <Stack spacing={0.25}>
                    <TextField
                      label="Search for template"
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
                    <TextField id="outlined-multiline-flexible" multiline minRows={7} variant="outlined" placeholder='Enter  comments' />
                  </Stack>
                </Grid>
              </Grid>
            </div>
          </Grid>
        </Grid> 
       )}
        {hasPermission('nutritional_health_screen_section_nutrition_hope_views') && (
        <Grid item xs={12}>
          <div
            style={{
              borderLeft: '5px solid #0AA369',
              borderRadius: '5px',
              boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
              opacity:hasPermission('nutritional_health_screen_section_nutrition_hope_edit')? 1 :0.9,
              pointerEvents:hasPermission('nutritional_health_screen_section_nutrition_hope_edit') ? 'auto':'none' 
            }}
          >
            <div style={{ backgroundColor: '#44BB769F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                <h2>Nutritional Health Screen</h2>
            </div>
            <Grid container spacing={3} sx={{ p: 1 }}>
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="h5" color="dark">
                  Nutrition Assessment
                </Typography>
                <Grid container item xs={12} spacing={2}>
                  <Grid item xs={12}>
                  <Stack spacing={1.25}>
                  {nutritionTemplateData.map(template => (
                      <FormControlLabel
                        key={template.id}
                        value={template.id}
                        control={
                          <Checkbox
                            sx={{ m: 0, p: 0 }}
                            checked={Boolean(checkedTemplate[template.id.toString()])}
                            onChange={() => handleCheckboxChange(template.id.toString())}
                          />
                        }
                        label={`${template.name}`}
                        sx={{ m: 0, p: 0 }}
                      />
                    ))} </Stack>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </div>
        </Grid>
         )}
          {hasPermission('plan_of_care_orders_section_nutrition_hope_views') && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div style={{
               borderLeft: '5px solid #A624E2', 
               borderRadius: '5px', 
               boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
               opacity:hasPermission('plan_of_care_orders_section_nutrition_hope_edit')? 1 :0.9,
                pointerEvents:hasPermission('plan_of_care_orders_section_nutrition_hope_edit') ? 'auto':'none' 
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
                      label="Altration in Nutritional Status:"
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

export default NutritionPage;


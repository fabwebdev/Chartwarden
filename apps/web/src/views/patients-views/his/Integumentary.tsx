import {
    Grid,
    Stack,
    FormControlLabel,
    Checkbox,
    TextField,
    InputAdornment,
    Button,
    Typography,
  } from '@mui/material';
  import MainCard from 'components/MainCard';
  import { SearchNormal1 } from 'iconsax-react';
  import http from '../../../hooks/useCookie';
import { useEffect, useState, useCallback } from 'react';
import AuthService from 'types/AuthService';
  const IntegumentaryPage =  ({ id }: { id: string })=> {
    const { permissions, user } = AuthService();
    
    // Check if user has admin role - handle different role structures
    const isAdmin = (() => {
      if (!user?.role) return false;
      // Handle string role
      if (typeof user.role === 'string') {
        return user.role.toLowerCase() === 'admin';
      }
      // Handle object role with name property
      if (typeof user.role === 'object' && user.role.name) {
        return user.role.name.toLowerCase() === 'admin';
      }
      return false;
    })();
    
    const hasPermission = (permission: any) => {
      // Admin users have all permissions
      if (isAdmin) {
        return true;
      }
      return permissions && Array.isArray(permissions) && permissions.includes(permission);
    };
    const [checkedIntegumentary, setCheckedIntegumentary] = useState<{ [key: string]: boolean }>({});
    const [integumentaryAssessmentData, setIntegumentaryAssessmentData] = useState<{ id: string; name: string; }[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Step 2: Load existing assessment to pre-select checkboxes
    const loadExistingAssessment = useCallback(async () => {
      try {
        const response = await http.get(`/integumentary-assessment/integumentary-assessment/${id}`);
        console.log('Integumentary by ID response:', response);
        
        // Handle 200 response with empty data (no existing assessment)
        if (response.data?.integumentary_ids) {
          const idArray = response.data.integumentary_ids.split(',').filter((id: string) => id.trim() !== '');
          const checkedState: { [key: string]: boolean } = {};
          
          idArray.forEach((id: any) => {
            checkedState[id.trim()] = true;
          });
          
          setCheckedIntegumentary(checkedState);
          console.log('Pre-selected integumentary IDs:', checkedState);
        } else {
          // No existing assessment - all checkboxes will be unchecked
          console.log('No existing assessment found - starting with empty selection');
          setCheckedIntegumentary({});
        }
      } catch (error: any) {
        console.error('Error fetching integumentary by ID:', error);
        console.error('Error details:', error.response?.data || error.message);
        // If error, start with empty selection
        setCheckedIntegumentary({});
      } finally {
        setLoading(false);
      }
    }, [id]);
    
    // Step 1: Load the integumentary list first (to populate checkboxes)
    const loadIntegumentaryList = useCallback(async () => {
      try {
        const response = await http.get(`/integumentary-assessment/integumentary-list`);
        console.log('Integumentary list response:', response);
        
        if (response.data) {
          // Handle both array and object with data property
          const data = Array.isArray(response.data) 
            ? response.data 
            : (response.data.data || response.data);
          
          setIntegumentaryAssessmentData(data || []);
          console.log('Integumentary data set:', data);
          
          // After list is loaded, load existing assessment
          await loadExistingAssessment();
        }
      } catch (error: any) {
        console.error('Error fetching integumentary list:', error);
        console.error('Error details:', error.response?.data || error.message);
        setLoading(false);
      }
    }, [loadExistingAssessment]);
    // Step 3: Handle checkbox selection/deselection and save
    const handleCheckboxChange = (ids: any) => {
      // Toggle the checkbox state
      const updatedCheckedIntegumentary: { [key: string]: boolean } = {
        ...checkedIntegumentary,
        [ids]: !checkedIntegumentary[ids]
      };
      
      // Update local state immediately for responsive UI
      setCheckedIntegumentary(updatedCheckedIntegumentary);
      
      // Get selected IDs (only checked ones)
      const selectedIntegumentaryIds = Object.keys(updatedCheckedIntegumentary)
        .filter(key => updatedCheckedIntegumentary[key]);
      
      // Step 4: Save selections using POST endpoint
      http
        .post(`/integumentary-assessment/integumentary-assessment/store`, {
          patient_id: id,
          integumentary_ids: selectedIntegumentaryIds
        })
        .then((response: any) => {
          console.log('Integumentary assessment saved:', response);
        })
        .catch((error: any) => {
          console.error('Error saving integumentary assessment:', error);
          console.error('Error details:', error.response?.data || error.message);
          // Revert the checkbox state on error
          setCheckedIntegumentary(checkedIntegumentary);
        });
    };
    
    // Load data on component mount
    useEffect(() => {
      if (id) {
        loadIntegumentaryList();
      }
    }, [id, loadIntegumentaryList]);
    return (
      <>
        <MainCard title="Integumentary">
        {(isAdmin || hasPermission('integumentary_assessment_section_integumentary_his_views')) && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div
                style={{
                  borderLeft: '5px solid #0E83B9',
                  borderRadius: '5px',
                  boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                  opacity: (isAdmin || hasPermission('integumentary_assessment_section_integumentary_his_edit')) ? 1 : 0.9,
                  pointerEvents: (isAdmin || hasPermission('integumentary_assessment_section_integumentary_his_edit')) ? 'auto' : 'none' 
                }}
              >
                <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Integumentary Assessment</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                    <Stack spacing={1.25} sx={{mb:1}}>
                    {loading ? (
                      <Typography variant="body2" color="text.secondary">
                        Loading integumentary assessment options...
                      </Typography>
                    ) : integumentaryAssessmentData && integumentaryAssessmentData.length > 0 ? (
                      integumentaryAssessmentData.map((integumentary) => (
                        <FormControlLabel
                          key={integumentary.id}
                          control={
                            <Checkbox
                              sx={{ m: 0, p: 0 }}
                              value={integumentary.id}
                              checked={Boolean(checkedIntegumentary[integumentary.id])}
                              onChange={() => handleCheckboxChange(integumentary.id.toString())}
                            />
                          }
                          label={integumentary.name}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No integumentary assessment options available.
                      </Typography>
                    )}
                    </Stack>
                    <Button variant="contained">Wound Worksheet</Button>
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
            <Grid item xs={12}>
              <div
                style={{
                  borderLeft: '5px solid #0E83B9',
                  borderRadius: '5px',
                  boxShadow: '0px 0px 5px 2px rgba(0, 0, 0, 0.1)',
                  opacity: (isAdmin || hasPermission('integumentary_assessment_section_integumentary_his_edit')) ? 1 : 0.9,
                  pointerEvents: (isAdmin || hasPermission('integumentary_assessment_section_integumentary_his_edit')) ? 'auto' : 'none' 
                }}
              >
                <div style={{ backgroundColor: '#4495BB9F', color: '#ffffff', borderTopRightRadius: '5px', paddingLeft: '10px' }}>
                  <h2>Integumentary Assessment</h2>
                </div>
                <Grid container spacing={3} sx={{ p: 1 }}>
                <Grid item xs={12}>
                    <Button variant="contained">Wound Worksheet</Button>
                  </Grid>
                </Grid>
              </div>
            </Grid>
          </Grid> )}
        </MainCard>
      </>
    );
  };
  
  export default IntegumentaryPage;
  
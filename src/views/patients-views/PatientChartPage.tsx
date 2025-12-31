import React, { useEffect, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Button, Grid, MenuItem, MenuList, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import http from '../../hooks/useCookie';
import AuthService from 'types/AuthService';
import { createBenefitPeriod } from '../../api/patient';
import Swal from 'sweetalert2';

interface NursingClinicalNote {
  id: string;
  note_date: string;
  note: string;
}

interface BenefitPeriod {
  id: string;
  start_date: string;
  end_date: string | null;
  period_number: number;
  nursing_clinical_notes: NursingClinicalNote[];
  hasNote: boolean;
}

interface PatientChartPageProps {
  id: string;
}

const PatientChartPage: React.FC<PatientChartPageProps> = ({ id }) => {
  const router = useRouter();
  const { permissions } = AuthService();
  const [benefitPeriods, setBenefitPeriods] = useState<BenefitPeriod[]>([]);

  const { user } = AuthService();
  
  // Check if user has permission to create clinical notes
  const canCreateClinicalNote = () => {
    return permissions.includes('create:clinical_notes') ||
           permissions.includes('view:clinical_notes') ||
           permissions.includes('update:clinical_notes');
  };

  // Check if user has permission to create benefit periods
  const canCreateBenefitPeriod = () => {
    const isAdmin = user?.role === 'admin' || user?.role?.name === 'admin' || user?.role?.toLowerCase() === 'admin';
    if (isAdmin) return true;
    return permissions.includes('update:patient') || permissions.includes('create:patient');
  };

  const [creatingPeriod, setCreatingPeriod] = useState(false);

  const handleCreateBenefitPeriod = async () => {
    if (!id) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Patient ID is missing',
      });
      return;
    }

    try {
      setCreatingPeriod(true);
      await createBenefitPeriod(id);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Benefit period created successfully!',
      });
      // Refresh the chart data
      const response = await http.get(`/benefit-periods/patients/${id}/chart`);
      const responseData = response.data || response;
      const periods = responseData.benefitPeriods || responseData.benefit_periods || [];
      if (Array.isArray(periods) && periods.length > 0) {
        const periodsWithNoteFlag = periods.map((period: any) => ({
          ...period,
          hasNote: (period.nursing_clinical_notes || period.nursingClinicalNotes || []).length > 0,
          nursing_clinical_notes: period.nursing_clinical_notes || period.nursingClinicalNotes || [],
        }));
        setBenefitPeriods(periodsWithNoteFlag);
      }
    } catch (error: any) {
      console.error('Error creating benefit period:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to create benefit period',
      });
    } finally {
      setCreatingPeriod(false);
    }
  };

  useEffect(() => {
    const fetchPatientChart = async () => {
      try {
        const response = await http.get(`/benefit-periods/patients/${id}/chart`);
        
        // Handle different response structures
        const responseData = response.data || response;
        
        // Check for both camelCase and snake_case property names
        const periods = responseData.benefitPeriods || responseData.benefit_periods || [];
        
        if (Array.isArray(periods) && periods.length > 0) {
          const periodsWithNoteFlag = periods.map((period: any) => ({
            ...period,
            hasNote: (period.nursing_clinical_notes || period.nursingClinicalNotes || []).length > 0,
            nursing_clinical_notes: period.nursing_clinical_notes || period.nursingClinicalNotes || [],
          }));
          setBenefitPeriods(periodsWithNoteFlag);
        } else {
          // No benefit periods found
          setBenefitPeriods([]);
        }
      } catch (error) {
        console.error('Error fetching patient chart data:', error);
        setBenefitPeriods([]);
      }
    };

    fetchPatientChart();
  }, [id]);

  const handleNursingClinicalNoteClick = (noteId: string) => {
    router.push(`/patients/nursing-clinical-note/${noteId}`);
  };

  const handleAddNote = async (periodId: string) => {
    try {
      const response = await http.post(`/benefit-periods/benefit-periods/${periodId}/nursing-clinical-notes`, {
        note_date: new Date().toISOString().split('T')[0], // Current date
        note: 'New clinical note',
      });
      const noteResponse = response.data?.nursing_clinical_note || response.data;
      const newNote = {
        ...noteResponse,
        note_date: noteResponse?.note_date || new Date().toISOString().split('T')[0],
        note: noteResponse?.note || 'New clinical note',
      };

      setBenefitPeriods(prevPeriods => 
        prevPeriods.map(period => 
          period.id === periodId
            ? { ...period, nursing_clinical_notes: [...period.nursing_clinical_notes, newNote], hasNote: true }
            : period
        )
      );
    } catch (error) {
      console.error('Error adding nursing clinical note:', error);
    }
  };

  return (
    <Grid container style={{ minHeight: '100px' }}>
      <Grid item xs={12}>
        {benefitPeriods.length === 0 ? (
          <Grid container spacing={2} sx={{ p: 3 }}>
            <Grid item xs={12} textAlign="center">
              <Typography variant="h6" color="textSecondary">
                No benefit periods found for this patient.
              </Typography>
              {canCreateBenefitPeriod() ? (
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleCreateBenefitPeriod}
                  disabled={creatingPeriod}
                  sx={{ mt: 2 }}
                >
                  {creatingPeriod ? 'Creating...' : 'Create Benefit Period'}
                </Button>
              ) : (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  You need permission to create benefit periods.
                </Typography>
              )}
            </Grid>
          </Grid>
        ) : (
          <>
            {canCreateBenefitPeriod() && (
              <Grid container justifyContent="flex-end" sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCreateBenefitPeriod}
                  disabled={creatingPeriod}
                >
                  {creatingPeriod ? 'Creating...' : 'Add Benefit Period'}
                </Button>
              </Grid>
            )}
            {benefitPeriods.map((period, index) => (
            <Accordion key={period.id}>
              <AccordionSummary aria-controls={`panel${index}-content`} id={`panel${index}-header`}>
                <Typography variant="h4" color="secondary">
                  Chart {index + 1} Benefit Period:
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <MenuList>
                  {(period.nursing_clinical_notes || []).map((note: any) => (
                    <MenuItem key={note.id} onClick={() => handleNursingClinicalNoteClick(note.id)}>
                      <Typography variant="h5" color="secondary">
                        Nursing clinical note {new Date(note.note_date || note.noteDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {note.note || ''}
                      </Typography>
                    </MenuItem>
                  ))}
                </MenuList>
                {!period.hasNote && canCreateClinicalNote() && (
                  <Button variant="contained" color="primary" onClick={() => handleAddNote(period.id)}>
                    Add Note
                  </Button>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
          </>
        )}
      </Grid>
    </Grid>
  );
};

export default PatientChartPage;
